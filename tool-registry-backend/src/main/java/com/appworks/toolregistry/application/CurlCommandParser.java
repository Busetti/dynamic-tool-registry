package com.appworks.toolregistry.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Builder;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponents;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Parses a pasted {@code curl} command into the platform's HTTP tool
 * configuration: method, URI, headers, query parameters and — for JSON
 * bodies — a {@code {{param}}} body template with derived body parameters.
 *
 * <p>Supported flags: {@code -X/--request}, {@code -H/--header},
 * {@code -d/--data/--data-raw/--data-binary/--data-ascii}, {@code --url},
 * {@code -G/--get}. Cosmetic flags ({@code --compressed}, {@code -s},
 * {@code -k}, {@code -L}, ...) are ignored with a warning where relevant.
 */
@Component
@RequiredArgsConstructor
public class CurlCommandParser {

    private static final Pattern SENSITIVE_HEADER = Pattern.compile(
            "(?i)^(authorization|x-api-key|api[-_]?key|x-auth-token|token|secret|cookie|x-access-token)$");

    private final ObjectMapper objectMapper;

    @Builder
    public record ParsedCurl(
            String method,
            String uri,
            String contentType,
            List<ParsedHeader> headers,
            List<ParsedParameter> pathVariables,
            List<ParsedParameter> queryParameters,
            List<ParsedParameter> bodyParameters,
            String requestBodyTemplate,
            List<String> warnings
    ) {
    }

    public record ParsedHeader(String name, String value, boolean sensitive) {
    }

    public record ParsedParameter(String name, String type, String defaultValue, boolean required) {
    }

    public ParsedCurl parse(String curlCommand) {
        List<String> tokens = tokenize(curlCommand.trim());
        if (tokens.isEmpty() || !tokens.get(0).equalsIgnoreCase("curl")) {
            throw new IllegalArgumentException("Command must start with 'curl'");
        }

        String method = null;
        String url = null;
        String rawBody = null;
        boolean forceGet = false;
        List<ParsedHeader> headers = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        Iterator<String> it = tokens.subList(1, tokens.size()).iterator();
        while (it.hasNext()) {
            String token = it.next();
            switch (token) {
                case "-X", "--request" -> method = nextValue(it, token).toUpperCase();
                case "-H", "--header" -> {
                    String header = nextValue(it, token);
                    int colon = header.indexOf(':');
                    if (colon > 0) {
                        String name = header.substring(0, colon).trim();
                        String value = header.substring(colon + 1).trim();
                        headers.add(new ParsedHeader(name, value, SENSITIVE_HEADER.matcher(name).matches()));
                    }
                }
                case "-d", "--data", "--data-raw", "--data-binary", "--data-ascii" ->
                        rawBody = nextValue(it, token);
                case "--url" -> url = nextValue(it, token);
                case "-G", "--get" -> forceGet = true;
                case "-u", "--user" -> {
                    nextValue(it, token);
                    warnings.add("Basic auth (-u) is not imported — add an Authorization header instead");
                }
                case "-F", "--form" -> {
                    nextValue(it, token);
                    warnings.add("Multipart form data (-F) is not supported and was ignored");
                }
                case "-b", "--cookie" -> {
                    String cookie = nextValue(it, token);
                    headers.add(new ParsedHeader("Cookie", cookie, true));
                }
                default -> {
                    if (token.startsWith("-")) {
                        // cosmetic/transport flags: -s, -k, -L, --compressed, -v, -o file …
                        if (List.of("-o", "--output", "--max-time", "-m", "--connect-timeout").contains(token)) {
                            nextValue(it, token);
                        }
                    } else if (url == null) {
                        url = token;
                    }
                }
            }
        }

        if (url == null) {
            throw new IllegalArgumentException("No URL found in curl command");
        }
        if (!url.matches("^https?://.*")) {
            url = "https://" + url;
        }

        if (method == null) {
            method = (rawBody != null && !forceGet) ? "POST" : "GET";
        }
        if (!method.equals("GET") && !method.equals("POST")) {
            throw new IllegalArgumentException(
                    "Method %s is not supported yet — only GET and POST tools can be registered".formatted(method));
        }
        if (method.equals("GET") && rawBody != null) {
            warnings.add("Request body ignored because the method is GET");
            rawBody = null;
        }

        UriComponents components = UriComponentsBuilder.fromUriString(url).build();
        List<ParsedParameter> queryParameters = new ArrayList<>();
        components.getQueryParams().forEach((name, values) -> queryParameters.add(
                new ParsedParameter(name, "string",
                        values.isEmpty() ? null : values.get(0), false)));
        String baseUri = UriComponentsBuilder.fromUriString(url).replaceQuery(null).build().toUriString();

        // {var} templates in the URL path become declared path variables,
        // e.g. curl https://api.corp.com/users/{userId}
        List<ParsedParameter> pathVariables = new ArrayList<>();
        java.util.regex.Matcher pathVarMatcher =
                java.util.regex.Pattern.compile("\\{([a-zA-Z][a-zA-Z0-9_]*)}").matcher(baseUri);
        while (pathVarMatcher.find()) {
            pathVariables.add(new ParsedParameter(pathVarMatcher.group(1), "string", null, true));
        }

        String contentType = headers.stream()
                .filter(h -> h.name().equalsIgnoreCase("Content-Type"))
                .map(ParsedHeader::value)
                .findFirst()
                .orElse(rawBody != null ? "application/json" : null);
        List<ParsedHeader> nonContentTypeHeaders = headers.stream()
                .filter(h -> !h.name().equalsIgnoreCase("Content-Type"))
                .toList();

        BodyTemplate body = deriveBodyTemplate(rawBody, warnings);

        return ParsedCurl.builder()
                .method(method)
                .uri(baseUri)
                .contentType(contentType)
                .headers(nonContentTypeHeaders)
                .pathVariables(pathVariables)
                .queryParameters(queryParameters)
                .bodyParameters(body.parameters())
                .requestBodyTemplate(body.template())
                .warnings(warnings)
                .build();
    }

    private record BodyTemplate(String template, List<ParsedParameter> parameters) {
    }

    /**
     * Flat JSON bodies become {@code {{param}}} templates with typed body
     * parameters defaulting to the pasted values; anything else is kept as a
     * literal template with no parameters.
     */
    private BodyTemplate deriveBodyTemplate(String rawBody, List<String> warnings) {
        if (rawBody == null || rawBody.isBlank()) {
            return new BodyTemplate(null, List.of());
        }
        // Explicit {{param}} placeholders: keep the body exactly as written and
        // declare each placeholder as a required parameter,
        // e.g. -d '{"title": "{{title}}", "userId": {{userId}}}'
        java.util.regex.Matcher placeholderMatcher =
                java.util.regex.Pattern.compile("\\{\\{([a-zA-Z][a-zA-Z0-9_]*)}}").matcher(rawBody);
        java.util.LinkedHashSet<String> placeholders = new java.util.LinkedHashSet<>();
        while (placeholderMatcher.find()) {
            placeholders.add(placeholderMatcher.group(1));
        }
        if (!placeholders.isEmpty()) {
            return new BodyTemplate(rawBody, placeholders.stream()
                    .map(name -> new ParsedParameter(name, "string", null, true))
                    .toList());
        }
        try {
            JsonNode root = objectMapper.readTree(rawBody);
            if (root.isObject()) {
                List<ParsedParameter> parameters = new ArrayList<>();
                StringBuilder template = new StringBuilder("{");
                boolean first = true;
                Iterator<Map.Entry<String, JsonNode>> fields = root.fields();
                while (fields.hasNext()) {
                    Map.Entry<String, JsonNode> field = fields.next();
                    if (!first) {
                        template.append(", ");
                    }
                    first = false;
                    template.append('"').append(field.getKey()).append("\": ");
                    JsonNode value = field.getValue();
                    if (value.isValueNode() && field.getKey().matches("^[a-zA-Z][a-zA-Z0-9_]*$")) {
                        String type = value.isBoolean() ? "boolean"
                                : value.isIntegralNumber() ? "integer"
                                : value.isNumber() ? "number" : "string";
                        if ("string".equals(type)) {
                            template.append("\"{{").append(field.getKey()).append("}}\"");
                        } else {
                            template.append("{{").append(field.getKey()).append("}}");
                        }
                        parameters.add(new ParsedParameter(field.getKey(), type, value.asText(), true));
                    } else {
                        // nested objects/arrays or awkward key names stay literal
                        template.append(value.toString());
                    }
                }
                template.append("}");
                return new BodyTemplate(template.toString(), parameters);
            }
            return new BodyTemplate(rawBody, List.of());
        } catch (Exception e) {
            warnings.add("Body is not valid JSON — kept as a literal template with no parameters");
            return new BodyTemplate(rawBody, List.of());
        }
    }

    private static String nextValue(Iterator<String> it, String flag) {
        if (!it.hasNext()) {
            throw new IllegalArgumentException("Missing value after " + flag);
        }
        return it.next();
    }

    /** Shell-like tokenizer: handles single/double quotes, escapes and line continuations. */
    private static List<String> tokenize(String input) {
        List<String> tokens = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inSingle = false;
        boolean inDouble = false;
        boolean tokenStarted = false;

        for (int i = 0; i < input.length(); i++) {
            char c = input.charAt(i);
            if (inSingle) {
                if (c == '\'') {
                    inSingle = false;
                } else {
                    current.append(c);
                }
            } else if (inDouble) {
                if (c == '"') {
                    inDouble = false;
                } else if (c == '\\' && i + 1 < input.length() && (input.charAt(i + 1) == '"' || input.charAt(i + 1) == '\\')) {
                    current.append(input.charAt(++i));
                } else {
                    current.append(c);
                }
            } else if (c == '\'') {
                inSingle = true;
                tokenStarted = true;
            } else if (c == '"') {
                inDouble = true;
                tokenStarted = true;
            } else if (c == '\\' && i + 1 < input.length() && (input.charAt(i + 1) == '\n' || input.charAt(i + 1) == '\r')) {
                i++; // line continuation
                if (i + 1 < input.length() && input.charAt(i) == '\r' && input.charAt(i + 1) == '\n') {
                    i++;
                }
            } else if (Character.isWhitespace(c)) {
                if (tokenStarted || !current.isEmpty()) {
                    tokens.add(current.toString());
                    current.setLength(0);
                    tokenStarted = false;
                }
            } else {
                current.append(c);
                tokenStarted = true;
            }
        }
        if (tokenStarted || !current.isEmpty()) {
            tokens.add(current.toString());
        }
        return tokens;
    }
}

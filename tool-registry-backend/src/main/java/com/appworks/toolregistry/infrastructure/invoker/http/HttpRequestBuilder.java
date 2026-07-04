package com.appworks.toolregistry.infrastructure.invoker.http;

import com.appworks.toolregistry.domain.exception.ToolInvocationException;
import com.appworks.toolregistry.domain.model.HttpToolConfig;
import com.appworks.toolregistry.domain.model.ToolParameter;
import lombok.Builder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Resolves a tool's HTTP configuration plus caller arguments into a concrete
 * request: URI with path variables substituted, query string, headers and body.
 */
@Component
public class HttpRequestBuilder {

    @Builder
    public record ResolvedRequest(
            URI uri,
            Map<String, String> headers,
            String body
    ) {
    }

    public ResolvedRequest build(HttpToolConfig config, Map<String, Object> arguments) {
        Map<String, Object> args = arguments == null ? Map.of() : arguments;

        String uriTemplate = config.getUri();
        for (ToolParameter pathVar : safe(config.getPathVariables())) {
            Object value = valueOf(pathVar, args);
            if (value == null) {
                throw new ToolInvocationException("Missing required path variable: " + pathVar.getName());
            }
            uriTemplate = uriTemplate.replace("{" + pathVar.getName() + "}",
                    URLEncoder.encode(String.valueOf(value), StandardCharsets.UTF_8));
        }

        UriComponentsBuilder uriBuilder = UriComponentsBuilder.fromUriString(uriTemplate);
        for (ToolParameter queryParam : safe(config.getQueryParameters())) {
            Object value = valueOf(queryParam, args);
            if (value == null) {
                if (queryParam.isRequired()) {
                    throw new ToolInvocationException("Missing required query parameter: " + queryParam.getName());
                }
                continue;
            }
            uriBuilder.queryParam(queryParam.getName(), String.valueOf(value));
        }

        Map<String, String> headers = new LinkedHashMap<>();
        safe(config.getHeaders()).forEach(h -> {
            if (h.getValue() != null) {
                headers.put(h.getName(), h.getValue());
            }
        });

        String body = resolveBody(config, args);

        return ResolvedRequest.builder()
                .uri(uriBuilder.build(true).toUri())
                .headers(headers)
                .body(body)
                .build();
    }

    private String resolveBody(HttpToolConfig config, Map<String, Object> args) {
        if (!"POST".equalsIgnoreCase(config.getMethod())) {
            return null;
        }
        if (StringUtils.hasText(config.getRequestBodyTemplate())) {
            String body = config.getRequestBodyTemplate();
            for (ToolParameter param : safe(config.getBodyParameters())) {
                Object value = valueOf(param, args);
                if (value == null && param.isRequired()) {
                    throw new ToolInvocationException("Missing required body parameter: " + param.getName());
                }
                body = body.replace("{{" + param.getName() + "}}", value == null ? "" : String.valueOf(value));
            }
            return body;
        }
        if (!safe(config.getBodyParameters()).isEmpty()) {
            // No template: send declared body parameters as a flat JSON object.
            StringBuilder json = new StringBuilder("{");
            boolean first = true;
            for (ToolParameter param : safe(config.getBodyParameters())) {
                Object value = valueOf(param, args);
                if (value == null) {
                    if (param.isRequired()) {
                        throw new ToolInvocationException("Missing required body parameter: " + param.getName());
                    }
                    continue;
                }
                if (!first) {
                    json.append(',');
                }
                first = false;
                json.append('"').append(param.getName()).append("\":").append(toJsonValue(param, value));
            }
            return json.append('}').toString();
        }
        return null;
    }

    private static String toJsonValue(ToolParameter param, Object value) {
        String type = param.getType() == null ? "string" : param.getType();
        if ("string".equals(type)) {
            return '"' + String.valueOf(value).replace("\\", "\\\\").replace("\"", "\\\"") + '"';
        }
        return String.valueOf(value);
    }

    private static Object valueOf(ToolParameter param, Map<String, Object> args) {
        Object value = args.get(param.getName());
        if (value == null && param.getDefaultValue() != null) {
            return param.getDefaultValue();
        }
        return value;
    }

    private static <T> List<T> safe(List<T> list) {
        return list == null ? List.of() : list;
    }
}

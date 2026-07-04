package com.appworks.toolregistry.infrastructure.invoker.http;

import com.appworks.toolregistry.domain.exception.ToolInvocationException;
import com.appworks.toolregistry.domain.model.HttpToolConfig;
import com.appworks.toolregistry.domain.model.Tool;
import com.appworks.toolregistry.domain.model.ToolHeader;
import com.appworks.toolregistry.domain.model.ToolType;
import com.appworks.toolregistry.domain.model.invocation.ConnectionTestResult;
import com.appworks.toolregistry.domain.model.invocation.ToolInvocationResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.net.URI;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Executes HTTP tools (GET/POST). The first — and currently only —
 * {@code ToolInvoker} strategy.
 */
@Slf4j
@Component
public class HttpToolInvoker implements com.appworks.toolregistry.infrastructure.invoker.ToolInvoker {

    private static final String MASKED_VALUE = "********";

    private final HttpRequestBuilder requestBuilder;
    private final SsrfGuard ssrfGuard;

    public HttpToolInvoker(HttpRequestBuilder requestBuilder, SsrfGuard ssrfGuard) {
        this.requestBuilder = requestBuilder;
        this.ssrfGuard = ssrfGuard;
    }

    @Override
    public ToolType supportedType() {
        return ToolType.HTTP;
    }

    @Override
    public ToolInvocationResult invoke(Tool tool, Map<String, Object> arguments) {
        HttpToolConfig config = requireConfig(tool);
        long start = System.currentTimeMillis();
        HttpRequestBuilder.ResolvedRequest request;
        try {
            request = requestBuilder.build(config, arguments);
            ssrfGuard.validate(request.uri());
        } catch (ToolInvocationException e) {
            return ToolInvocationResult.builder()
                    .success(false)
                    .durationMs(System.currentTimeMillis() - start)
                    .method(config.getMethod())
                    .error(e.getMessage())
                    .build();
        }

        try {
            RestClient client = clientFor(config);
            RestClient.RequestBodySpec spec = client
                    .method(org.springframework.http.HttpMethod.valueOf(config.getMethod().toUpperCase()))
                    .uri(request.uri())
                    .headers(h -> request.headers().forEach(h::set));
            if (request.body() != null) {
                spec.contentType(MediaType.parseMediaType(
                                config.getContentType() == null ? "application/json" : config.getContentType()))
                        .body(request.body());
            }
            ResponseEntity<String> response = spec.retrieve()
                    .onStatus(status -> true, (req, res) -> { /* never throw; echo everything */ })
                    .toEntity(String.class);

            return ToolInvocationResult.builder()
                    .success(response.getStatusCode().is2xxSuccessful())
                    .statusCode(response.getStatusCode().value())
                    .durationMs(System.currentTimeMillis() - start)
                    .resolvedUri(request.uri().toString())
                    .method(config.getMethod())
                    .requestHeaders(maskedHeaders(config, request.headers()))
                    .requestBody(request.body())
                    .responseHeaders(flatten(response.getHeaders()))
                    .responseBody(response.getBody())
                    .build();
        } catch (Exception e) {
            log.warn("Tool '{}' invocation failed: {}", tool.getToolName(), e.getMessage());
            return ToolInvocationResult.builder()
                    .success(false)
                    .durationMs(System.currentTimeMillis() - start)
                    .resolvedUri(request.uri().toString())
                    .method(config.getMethod())
                    .requestHeaders(maskedHeaders(config, request.headers()))
                    .requestBody(request.body())
                    .error(e.getMessage())
                    .build();
        }
    }

    @Override
    public ConnectionTestResult testConnection(Tool tool) {
        HttpToolConfig config = requireConfig(tool);
        long start = System.currentTimeMillis();
        try {
            // Strip path variables for a base reachability probe against the URI root.
            URI target = URI.create(config.getUri().replaceAll("\\{[^}]+}", "1"));
            ssrfGuard.validate(target);
            ResponseEntity<Void> response = clientFor(config)
                    .method(org.springframework.http.HttpMethod.GET)
                    .uri(target)
                    .retrieve()
                    .onStatus(status -> true, (req, res) -> { })
                    .toBodilessEntity();
            long latency = System.currentTimeMillis() - start;
            return ConnectionTestResult.builder()
                    .reachable(true)
                    .statusCode(response.getStatusCode().value())
                    .latencyMs(latency)
                    .message("Endpoint responded with HTTP " + response.getStatusCode().value())
                    .build();
        } catch (Exception e) {
            return ConnectionTestResult.builder()
                    .reachable(false)
                    .latencyMs(System.currentTimeMillis() - start)
                    .message(e.getMessage())
                    .build();
        }
    }

    private RestClient clientFor(HttpToolConfig config) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        Duration timeout = Duration.ofMillis(config.getTimeoutMs() > 0 ? config.getTimeoutMs() : 10000);
        factory.setConnectTimeout(timeout);
        factory.setReadTimeout(timeout);
        return RestClient.builder().requestFactory(factory).build();
    }

    private static HttpToolConfig requireConfig(Tool tool) {
        if (tool.getHttpConfig() == null) {
            throw new ToolInvocationException("Tool '%s' has no HTTP configuration".formatted(tool.getToolName()));
        }
        return tool.getHttpConfig();
    }

    private static Map<String, String> maskedHeaders(HttpToolConfig config, Map<String, String> headers) {
        Map<String, String> masked = new LinkedHashMap<>(headers);
        if (config.getHeaders() != null) {
            config.getHeaders().stream()
                    .filter(ToolHeader::isSensitive)
                    .forEach(h -> masked.computeIfPresent(h.getName(), (k, v) -> MASKED_VALUE));
        }
        return masked;
    }

    private static Map<String, String> flatten(HttpHeaders headers) {
        Map<String, String> flat = new LinkedHashMap<>();
        headers.forEach((name, values) -> flat.put(name, String.join(", ", values)));
        return flat;
    }
}

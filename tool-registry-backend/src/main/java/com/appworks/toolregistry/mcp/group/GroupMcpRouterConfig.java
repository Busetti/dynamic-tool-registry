package com.appworks.toolregistry.mcp.group;

import com.appworks.toolregistry.infrastructure.persistence.GroupRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.servlet.function.RouterFunction;
import org.springframework.web.servlet.function.RouterFunctions;
import org.springframework.web.servlet.function.ServerRequest;
import org.springframework.web.servlet.function.ServerResponse;

import java.util.Map;
import java.util.Optional;

/**
 * Routes {@code /mcp/group/{mcpKey}/sse} and {@code /mcp/group/{mcpKey}/message}
 * to the matching group's MCP server. Because routing is resolved per request,
 * group servers created at runtime are reachable immediately — no restart.
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class GroupMcpRouterConfig {

    private final GroupMcpServerRegistry groupMcpServerRegistry;
    private final GroupRepository groupRepository;

    @Bean
    public RouterFunction<ServerResponse> groupMcpRouter() {
        return RouterFunctions.route()
                .GET("/mcp/group/{mcpKey}/sse", this::dispatch)
                .POST("/mcp/group/{mcpKey}/message", this::dispatch)
                .build();
    }

    private ServerResponse dispatch(ServerRequest request) {
        String mcpKey = request.pathVariable("mcpKey");

        Optional<GroupMcpServerRegistry.GroupMcpServer> groupServer = groupMcpServerRegistry.get(mcpKey)
                .or(() -> groupRepository.findByMcpKey(mcpKey)
                        .map(groupMcpServerRegistry::getOrCreate));

        if (groupServer.isEmpty()) {
            return ServerResponse.status(HttpStatus.NOT_FOUND)
                    .contentType(MediaType.APPLICATION_PROBLEM_JSON)
                    .body(Map.of(
                            "title", "Unknown MCP Key",
                            "status", 404,
                            "detail", "No group is associated with this MCP key"));
        }

        return groupServer.get().routerFunction().route(request)
                .map(handler -> {
                    try {
                        return handler.handle(request);
                    } catch (Exception e) {
                        log.error("Group MCP request failed for key {}: {}", mcpKey, e.getMessage());
                        return ServerResponse.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
                    }
                })
                .orElseGet(() -> ServerResponse.notFound().build());
    }
}

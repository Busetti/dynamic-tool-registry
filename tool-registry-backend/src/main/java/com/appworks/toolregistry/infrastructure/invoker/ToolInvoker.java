package com.appworks.toolregistry.infrastructure.invoker;

import com.appworks.toolregistry.domain.model.Tool;
import com.appworks.toolregistry.domain.model.ToolType;
import com.appworks.toolregistry.domain.model.invocation.ConnectionTestResult;
import com.appworks.toolregistry.domain.model.invocation.ToolInvocationResult;

import java.util.Map;

/**
 * Protocol execution strategy. One implementation per {@link ToolType}.
 *
 * <p>This is the platform's primary extension point: supporting a new
 * protocol (GraphQL, gRPC, Kafka, ...) means adding one implementation of
 * this interface plus its config subdocument on {@code Tool} — nothing else
 * changes.
 */
public interface ToolInvoker {

    ToolType supportedType();

    /** Execute the tool with resolved arguments supplied by the caller (AI model or test console). */
    ToolInvocationResult invoke(Tool tool, Map<String, Object> arguments);

    /** Lightweight availability check — no business side effects intended. */
    ConnectionTestResult testConnection(Tool tool);
}

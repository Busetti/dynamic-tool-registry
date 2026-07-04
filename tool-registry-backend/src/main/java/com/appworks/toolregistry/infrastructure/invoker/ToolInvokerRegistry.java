package com.appworks.toolregistry.infrastructure.invoker;

import com.appworks.toolregistry.domain.model.ToolType;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Resolves the execution strategy for a tool type. All {@link ToolInvoker}
 * beans are discovered automatically — registering a new protocol requires
 * no changes here.
 */
@Component
public class ToolInvokerRegistry {

    private final Map<ToolType, ToolInvoker> invokers = new EnumMap<>(ToolType.class);

    public ToolInvokerRegistry(List<ToolInvoker> discovered) {
        discovered.forEach(invoker -> invokers.put(invoker.supportedType(), invoker));
    }

    public ToolInvoker getInvoker(ToolType type) {
        ToolInvoker invoker = invokers.get(type);
        if (invoker == null) {
            throw new IllegalArgumentException("No invoker registered for tool type: " + type);
        }
        return invoker;
    }
}

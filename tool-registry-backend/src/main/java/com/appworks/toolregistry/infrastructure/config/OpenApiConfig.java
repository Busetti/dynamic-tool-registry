package com.appworks.toolregistry.infrastructure.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI toolRegistryOpenApi() {
        return new OpenAPI().info(new Info()
                .title("Dynamic Tool Registry API")
                .description("""
                        Central AI Tool Catalog and MCP Registry.
                        Register APIs as AI tools with rich business and technical metadata, \
                        organize them into groups and expose them dynamically to MCP-compatible clients \
                        without application restarts.""")
                .version("1.0.0")
                .contact(new Contact().name("Tool Registry Platform")));
    }
}

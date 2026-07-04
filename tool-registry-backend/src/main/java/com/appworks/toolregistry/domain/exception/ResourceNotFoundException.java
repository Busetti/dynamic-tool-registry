package com.appworks.toolregistry.domain.exception;

public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String resource, String id) {
        super("%s not found: %s".formatted(resource, id));
    }
}

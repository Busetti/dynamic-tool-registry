package com.appworks.toolregistry.infrastructure.persistence;

import com.appworks.toolregistry.domain.model.Group;
import com.appworks.toolregistry.domain.model.Tool;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.index.IndexOperations;
import org.springframework.data.mongodb.core.index.TextIndexDefinition;

/**
 * Creates all indexes programmatically and idempotently at startup.
 * Auto-index-creation is disabled in application.yml so this class is the
 * single source of truth for the index layout.
 */
@Slf4j
@Configuration
@EnableMongoAuditing
@RequiredArgsConstructor
public class MongoIndexConfig {

    private final MongoTemplate mongoTemplate;

    @PostConstruct
    public void createIndexes() {
        IndexOperations groups = mongoTemplate.indexOps(Group.class);
        groups.ensureIndex(new Index().on("name", Sort.Direction.ASC).unique());
        groups.ensureIndex(new Index().on("mcpKey", Sort.Direction.ASC).unique().sparse());
        groups.ensureIndex(new Index().on("tags", Sort.Direction.ASC));
        groups.ensureIndex(new Index().on("businessArea", Sort.Direction.ASC));

        IndexOperations tools = mongoTemplate.indexOps(Tool.class);
        tools.ensureIndex(new Index().on("toolName", Sort.Direction.ASC).unique());
        tools.ensureIndex(new Index().on("status", Sort.Direction.ASC).on("toolType", Sort.Direction.ASC));
        tools.ensureIndex(new Index().on("groupIds", Sort.Direction.ASC));
        tools.ensureIndex(new Index().on("category", Sort.Direction.ASC));
        tools.ensureIndex(new Index().on("tags", Sort.Direction.ASC));

        tools.ensureIndex(TextIndexDefinition.builder()
                .named("tool_text_search")
                .onField("toolName", 10F)
                .onField("displayName", 8F)
                .onField("aiContext.keywords", 8F)
                .onField("aiContext.searchAliases", 8F)
                .onField("description", 5F)
                .onField("aiContext.naturalLanguageDescription", 5F)
                .onField("businessPurpose", 3F)
                .onField("aiContext.useCases", 2F)
                .build());

        log.info("MongoDB indexes ensured for groups and tools collections");
    }
}

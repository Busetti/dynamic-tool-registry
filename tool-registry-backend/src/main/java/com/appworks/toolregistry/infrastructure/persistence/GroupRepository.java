package com.appworks.toolregistry.infrastructure.persistence;

import com.appworks.toolregistry.domain.model.Group;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface GroupRepository extends MongoRepository<Group, String> {

    Optional<Group> findByName(String name);

    Optional<Group> findByMcpKey(String mcpKey);

    boolean existsByName(String name);

    List<Group> findByBusinessAreaIgnoreCase(String businessArea);

    List<Group> findByTagsContaining(String tag);
}

package com.appworks.toolregistry.infrastructure.invoker.http;

import com.appworks.toolregistry.domain.exception.ToolInvocationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Blocks server-side request forgery: invocations may not target loopback,
 * link-local, private ranges or cloud metadata endpoints unless the host is
 * explicitly trusted via configuration.
 */
@Slf4j
@Component
public class SsrfGuard {

    private static final Set<String> METADATA_HOSTS = Set.of(
            "169.254.169.254",           // AWS / Azure / GCP metadata
            "metadata.google.internal",
            "metadata.azure.com");

    private final boolean enabled;
    private final Set<String> trustedHosts;

    public SsrfGuard(@Value("${tool-registry.ssrf.enabled:true}") boolean enabled,
                     @Value("${tool-registry.ssrf.trusted-hosts:localhost,127.0.0.1}") String trustedHosts) {
        this.enabled = enabled;
        this.trustedHosts = Arrays.stream(trustedHosts.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> s.toLowerCase(Locale.ROOT))
                .collect(Collectors.toSet());
    }

    public void validate(URI uri) {
        if (!enabled) {
            return;
        }
        String host = uri.getHost();
        if (host == null) {
            throw new ToolInvocationException("Invalid target URI: no host present");
        }
        String normalizedHost = host.toLowerCase(Locale.ROOT);
        if (trustedHosts.contains(normalizedHost)) {
            return;
        }
        if (METADATA_HOSTS.contains(normalizedHost)) {
            throw new ToolInvocationException("Blocked by SSRF guard: cloud metadata endpoint " + host);
        }
        InetAddress[] addresses;
        try {
            addresses = InetAddress.getAllByName(host);
        } catch (UnknownHostException e) {
            throw new ToolInvocationException("Cannot resolve host: " + host);
        }
        for (InetAddress address : addresses) {
            if (address.isLoopbackAddress() || address.isLinkLocalAddress()
                    || address.isSiteLocalAddress() || address.isAnyLocalAddress()) {
                throw new ToolInvocationException(
                        "Blocked by SSRF guard: %s resolves to restricted address %s. "
                                .formatted(host, address.getHostAddress())
                                + "Add the host to tool-registry.ssrf.trusted-hosts if intended.");
            }
        }
    }
}

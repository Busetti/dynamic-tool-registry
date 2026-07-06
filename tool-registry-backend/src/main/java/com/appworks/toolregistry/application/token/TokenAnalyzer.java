package com.appworks.toolregistry.application.token;

import com.knuddels.jtokkit.Encodings;
import com.knuddels.jtokkit.api.Encoding;
import com.knuddels.jtokkit.api.EncodingType;
import org.springframework.stereotype.Component;

/**
 * Estimates the token cost of text as an LLM would see it.
 *
 * <p>Uses jtokkit's {@code o200k_base} encoding (OpenAI's newest tokenizer).
 * There is no official Claude tokenizer for the JVM; this is a close, offline
 * approximation — surfaced in the UI as "approx (OpenAI o200k)". Counts are
 * typically within ~10-15% of Claude's for JSON/TOON payloads, which is more
 * than enough to compare formats and flag heavy tools.
 */
@Component
public class TokenAnalyzer {

    public static final String ENCODING_LABEL = "approx (OpenAI o200k)";

    private final Encoding encoding =
            Encodings.newDefaultEncodingRegistry().getEncoding(EncodingType.O200K_BASE);

    /** Approximate token count for the given text (null/blank → 0). */
    public int count(String text) {
        if (text == null || text.isEmpty()) {
            return 0;
        }
        return encoding.countTokens(text);
    }
}

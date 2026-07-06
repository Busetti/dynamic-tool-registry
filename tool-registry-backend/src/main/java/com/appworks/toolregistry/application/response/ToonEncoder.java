package com.appworks.toolregistry.application.response;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Encodes Jackson JSON trees as TOON (Token-Oriented Object Notation,
 * https://toonformat.dev) — a compact, lossless representation that typically
 * costs 30-50% fewer LLM tokens than JSON for uniform arrays.
 *
 * <p>Implements the encoding rules of the TOON spec v1 with the comma
 * delimiter: objects as {@code key: value} lines with 2-space indentation,
 * uniform primitive-object arrays in tabular form
 * ({@code key[N]{f1,f2}:} + one delimited row per element), primitive arrays
 * inline ({@code key[N]: a,b,c}), and mixed/non-uniform arrays in expanded
 * list form with {@code "- "} markers.
 *
 * <p>Self-contained on Jackson 2 (the version Spring Boot ships) — the
 * published JToon library requires Jackson 3, which conflicts.
 */
@Component
public class ToonEncoder {

    private static final Pattern UNQUOTED_SAFE = Pattern.compile("^[A-Za-z_][A-Za-z0-9_.-]*$");
    private static final Pattern NUMBER_LIKE = Pattern.compile("^-?\\d+(\\.\\d+)?([eE][+-]?\\d+)?$");

    /** Encodes a JSON tree to TOON text. */
    public String encode(JsonNode root) {
        StringBuilder out = new StringBuilder();
        if (root instanceof ArrayNode array) {
            encodeArray(out, null, array, 0);
        } else if (root instanceof ObjectNode object) {
            encodeObjectFields(out, object, 0);
        } else {
            out.append(scalar(root));
        }
        return out.toString().stripTrailing();
    }

    // ---- objects ----

    private void encodeObjectFields(StringBuilder out, ObjectNode object, int depth) {
        Iterator<String> names = object.fieldNames();
        while (names.hasNext()) {
            String name = names.next();
            JsonNode value = object.get(name);
            if (value instanceof ObjectNode child) {
                if (child.isEmpty()) {
                    line(out, depth, key(name) + ":");
                } else {
                    line(out, depth, key(name) + ":");
                    encodeObjectFields(out, child, depth + 1);
                }
            } else if (value instanceof ArrayNode array) {
                encodeArray(out, name, array, depth);
            } else {
                line(out, depth, key(name) + ": " + scalar(value));
            }
        }
    }

    // ---- arrays ----

    private void encodeArray(StringBuilder out, String name, ArrayNode array, int depth) {
        String prefix = name == null ? "" : key(name);
        int n = array.size();

        if (n == 0) {
            line(out, depth, prefix + "[0]:");
            return;
        }
        if (allPrimitives(array)) {
            List<String> values = new ArrayList<>(n);
            array.forEach(v -> values.add(cell(v)));
            line(out, depth, prefix + "[" + n + "]: " + String.join(",", values));
            return;
        }
        List<String> fields = tabularFields(array);
        if (fields != null) {
            String header = fields.stream().map(this::key).reduce((a, b) -> a + "," + b).orElse("");
            line(out, depth, prefix + "[" + n + "]{" + header + "}:");
            for (JsonNode element : array) {
                List<String> cells = new ArrayList<>(fields.size());
                for (String field : fields) {
                    cells.add(cell(element.get(field)));
                }
                line(out, depth + 1, String.join(",", cells));
            }
            return;
        }
        // Mixed / non-uniform: expanded list form.
        line(out, depth, prefix + "[" + n + "]:");
        for (JsonNode element : array) {
            if (element instanceof ObjectNode object && !object.isEmpty()) {
                encodeListItemObject(out, object, depth + 1);
            } else if (element instanceof ObjectNode) {
                line(out, depth + 1, "-");
            } else if (element instanceof ArrayNode inner) {
                if (allPrimitives(inner)) {
                    List<String> values = new ArrayList<>();
                    inner.forEach(v -> values.add(cell(v)));
                    line(out, depth + 1, "- [" + inner.size() + "]: " + String.join(",", values));
                } else {
                    line(out, depth + 1, "- [" + inner.size() + "]:");
                    for (JsonNode nested : inner) {
                        line(out, depth + 2, "- " + scalar(nested));
                    }
                }
            } else {
                line(out, depth + 1, "- " + scalar(element));
            }
        }
    }

    /** First field rides on the hyphen line; siblings at the same depth below. */
    private void encodeListItemObject(StringBuilder out, ObjectNode object, int depth) {
        StringBuilder buffer = new StringBuilder();
        encodeObjectFields(buffer, object, depth);
        String indent = "  ".repeat(depth);
        String rendered = buffer.toString();
        // Replace the first line's indent with "<indent-1>- ".
        String hyphenIndent = "  ".repeat(Math.max(0, depth - 1)) + "- ";
        out.append(hyphenIndent).append(rendered.substring(indent.length()));
    }

    // ---- helpers ----

    /** Uniform object arrays with primitive-only values are tabular-eligible. */
    private List<String> tabularFields(ArrayNode array) {
        List<String> fields = null;
        for (JsonNode element : array) {
            if (!(element instanceof ObjectNode object) || object.isEmpty()) {
                return null;
            }
            List<String> names = new ArrayList<>();
            Iterator<String> it = object.fieldNames();
            while (it.hasNext()) {
                String name = it.next();
                if (object.get(name).isContainerNode()) {
                    return null;
                }
                names.add(name);
            }
            if (fields == null) {
                fields = names;
            } else if (!fields.equals(names)) {
                return null;
            }
        }
        return fields;
    }

    private boolean allPrimitives(ArrayNode array) {
        for (JsonNode element : array) {
            if (element.isContainerNode()) {
                return false;
            }
        }
        return true;
    }

    private String scalar(JsonNode node) {
        if (node == null || node.isNull()) {
            return "null";
        }
        if (node.isBoolean() || node.isNumber()) {
            return node.asText();
        }
        return quoteIfNeeded(node.asText(), false);
    }

    /** A value inside a delimited row — must also quote when it contains the delimiter. */
    private String cell(JsonNode node) {
        if (node == null || node.isNull()) {
            return "null";
        }
        if (node.isBoolean() || node.isNumber()) {
            return node.asText();
        }
        return quoteIfNeeded(node.asText(), true);
    }

    private String key(String name) {
        return UNQUOTED_SAFE.matcher(name).matches() ? name : quote(name);
    }

    private String quoteIfNeeded(String text, boolean inRow) {
        if (text.isEmpty()
                || !text.strip().equals(text)
                || text.equals("true") || text.equals("false") || text.equals("null")
                || NUMBER_LIKE.matcher(text).matches()
                || text.chars().anyMatch(c -> c == ':' || c == '"' || c == '\\' || c == '[' || c == ']'
                        || c == '{' || c == '}' || c < 0x20)
                || (inRow && text.indexOf(',') >= 0)
                || text.startsWith("- ") || text.startsWith("#")) {
            return quote(text);
        }
        return text;
    }

    private String quote(String text) {
        StringBuilder sb = new StringBuilder("\"");
        for (char c : text.toCharArray()) {
            switch (c) {
                case '\\' -> sb.append("\\\\");
                case '"' -> sb.append("\\\"");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        return sb.append('"').toString();
    }

    private void line(StringBuilder out, int depth, String content) {
        out.append("  ".repeat(depth)).append(content).append('\n');
    }
}

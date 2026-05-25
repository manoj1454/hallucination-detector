package com.hallucination.detector.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record DetectTextRequest(@JsonProperty("text") String text) {
}

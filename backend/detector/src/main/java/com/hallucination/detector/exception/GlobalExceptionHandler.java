package com.hallucination.detector.exception;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

	@ExceptionHandler(MlServiceException.class)
	public ResponseEntity<Map<String, Object>> handleMlServiceException(MlServiceException ex) {
		return ResponseEntity.status(ex.getStatus()).body(Map.of(
				"success", false,
				"error", ex.getMessage()));
	}

	@ExceptionHandler(HttpMessageNotReadableException.class)
	public ResponseEntity<Map<String, Object>> handleInvalidJson(HttpMessageNotReadableException ex) {
		return ResponseEntity.badRequest().body(Map.of(
				"success", false,
				"error", "Invalid JSON body. Expected: {\"text\": \"your llm response\"}"));
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<Map<String, Object>> handleUnexpected(Exception ex) {
		return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
				"success", false,
				"error", "An unexpected error occurred: " + ex.getMessage()));
	}

}

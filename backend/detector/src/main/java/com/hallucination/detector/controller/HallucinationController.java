package com.hallucination.detector.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hallucination.detector.dto.DetectTextRequest;
import com.hallucination.detector.service.PythonMlClient;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:3000")
public class HallucinationController {

	private final PythonMlClient pythonMlClient;

	public HallucinationController(PythonMlClient pythonMlClient) {
		this.pythonMlClient = pythonMlClient;
	}

	@GetMapping("/health")
	public ResponseEntity<Map<String, String>> health() {
		return ResponseEntity.ok(Map.of("status", "ok"));
	}

	@PostMapping("/detect/text")
	public ResponseEntity<Map<String, Object>> detectText(@RequestBody DetectTextRequest request) {
		if (request.text() == null || request.text().isBlank()) {
			return ResponseEntity.badRequest().body(Map.of(
					"success", false,
					"error", "text field is required and must not be blank"));
		}

		Map<String, Object> result = pythonMlClient.detectText(request.text());
		return ResponseEntity.ok(result);
	}

}

package com.hallucination.detector.service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hallucination.detector.exception.MlServiceException;

@Service
public class PythonMlClient {

    private final String detectTextUrl;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10))
        .version(HttpClient.Version.HTTP_1_1)
        .build();

    public PythonMlClient(
            @Value("${ml.service.base-url:http://localhost:8000}") String baseUrl) {
        this.detectTextUrl = baseUrl.replaceAll("/$", "") + "/detect/text";
    }

    public Map<String, Object> detectText(String text) {
        try {
            // Build JSON body manually - 100% reliable
            String jsonBody = objectMapper.writeValueAsString(Map.of("text", text));

            System.out.println("=== Sending to Python ===");
            System.out.println("URL: " + detectTextUrl);
            System.out.println("Body: " + jsonBody);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(detectTextUrl))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .timeout(Duration.ofSeconds(300))
                    .build();

            HttpResponse<String> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString());

            System.out.println("Response status: " + response.statusCode());
            System.out.println("Response body: " + response.body());

            if (response.statusCode() != 200) {
                throw new MlServiceException(
                        "ML service error: " + response.statusCode() +
                        " - " + response.body(),
                        HttpStatus.BAD_GATEWAY);
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> result = objectMapper.readValue(
                    response.body(), Map.class);

            return result;

        } catch (MlServiceException e) {
            throw e;
        } catch (IOException | InterruptedException e) {
            throw new MlServiceException(
                    "Python ML service is not reachable at " + detectTextUrl,
                    HttpStatus.SERVICE_UNAVAILABLE,
                    e);
        }
    }
}
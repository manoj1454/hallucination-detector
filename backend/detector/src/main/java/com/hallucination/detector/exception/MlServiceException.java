package com.hallucination.detector.exception;

import org.springframework.http.HttpStatus;

public class MlServiceException extends RuntimeException {

	private final HttpStatus status;

	public MlServiceException(String message, HttpStatus status) {
		super(message);
		this.status = status;
	}

	public MlServiceException(String message, HttpStatus status, Throwable cause) {
		super(message, cause);
		this.status = status;
	}

	public HttpStatus getStatus() {
		return status;
	}

}

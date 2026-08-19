**@aligent/microservice-util-lib**

***

# @aligent/microservice-util-lib

## Classes

- [HttpResponseError](classes/HttpResponseError.md)

## Interfaces

- [ApiKey](interfaces/ApiKey.md)
- [Basic](interfaces/Basic.md)
- [ClientOptions](interfaces/ClientOptions.md)
- [ErrorThrowingClient](interfaces/ErrorThrowingClient.md)
- [OAuth10a](interfaces/OAuth10a.md)
- [OAuth20](interfaces/OAuth20.md)
- [RetryContext](interfaces/RetryContext.md)
- [RetryFetchConfig](interfaces/RetryFetchConfig.md)
- [RetryMiddlewareConfig](interfaces/RetryMiddlewareConfig.md)
- [RetryWrapperConfig](interfaces/RetryWrapperConfig.md)
- [~~S3Dao~~](interfaces/S3Dao.md)

## Type Aliases

- [LogMethod](type-aliases/LogMethod.md)
- [ObjectMap](type-aliases/ObjectMap.md)
- [OnRetryFn](type-aliases/OnRetryFn.md)
- [Remap](type-aliases/Remap.md)
- [RetryConditionFn](type-aliases/RetryConditionFn.md)
- [~~RetryConfig~~](type-aliases/RetryConfig.md)
- [RetryDelayFn](type-aliases/RetryDelayFn.md)

## Functions

- [apiKeyAuthMiddleware](functions/apiKeyAuthMiddleware.md)
- [basicAuthMiddleware](functions/basicAuthMiddleware.md)
- [chunkBy](functions/chunkBy.md)
- [createErrorThrowingClient](functions/createErrorThrowingClient.md)
- [createXmlParser](functions/createXmlParser.md)
- [~~fetchSsmParams~~](functions/fetchSsmParams.md)
- [getAwsIdFromArn](functions/getAwsIdFromArn.md)
- [hasDefinedProperties](functions/hasDefinedProperties.md)
- [isHttpResponseError](functions/isHttpResponseError.md)
- [logMiddleware](functions/logMiddleware.md)
- [oAuth10aAuthMiddleware](functions/oAuth10aAuthMiddleware.md)
- [oAuth20AuthMiddleware](functions/oAuth20AuthMiddleware.md)
- [parseXmlResponse](functions/parseXmlResponse.md)
- [remap](functions/remap.md)
- [requestTimeout](functions/requestTimeout.md)
- [resignOauth10aRequest](functions/resignOauth10aRequest.md)
- [retryFetch](functions/retryFetch.md)
- [~~retryMiddleware~~](functions/retryMiddleware.md)
- [retryWrapper](functions/retryWrapper.md)
- [throwOnNotOk](functions/throwOnNotOk.md)

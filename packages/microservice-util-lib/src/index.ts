/* v8 ignore start */
import chunkBy from './chunk-by/chunk-by.js';
import getAwsIdFromArn from './get-aws-id-from-arn/get-aws-id-from-arn.js';
import hasDefinedProperties from './has-properties-defined/has-properties-defined.js';
import {
    ApiKey,
    Basic,
    OAuth10a,
    OAuth20,
    apiKeyAuthMiddleware,
    basicAuthMiddleware,
    oAuth10aAuthMiddleware,
    oAuth20AuthMiddleware,
    resignOauth10aRequest,
} from './openapi-fetch-middlewares/authentications.js';
import { LogMethod, logMiddleware } from './openapi-fetch-middlewares/log.js';
import {
    createXmlParser,
    parseXmlResponse,
} from './openapi-fetch-middlewares/parse-xml-response.js';
import { requestTimeout } from './openapi-fetch-middlewares/request-timeout.js';
import { throwOnNotOk } from './openapi-fetch-middlewares/throw-on-not-ok.js';
import {
    ClientOptions,
    ErrorThrowingClient,
    createErrorThrowingClient,
} from './openapi-fetch-middlewares/throwing-client.js';
import type {
    OnRetryFn,
    RetryConditionFn,
    RetryContext,
    RetryDelayFn,
} from './openapi-fetch-middlewares/types/retry.js';
import {
    HttpResponseError,
    isHttpResponseError,
} from './openapi-fetch-middlewares/utils/http-response-error.js';
import remap, { ObjectMap, Remap } from './remap/remap.js';
import { RetryFetchConfig, retryFetch } from './retry-fetch/retry-fetch.js';
import retryWrapper, { RetryWrapperConfig } from './retry-wrapper/retry-wrapper.js';

export type {
    ApiKey,
    Basic,
    ClientOptions,
    ErrorThrowingClient,
    LogMethod,
    OAuth10a,
    OAuth20,
    ObjectMap,
    OnRetryFn,
    Remap,
    RetryConditionFn,
    RetryContext,
    RetryDelayFn,
    RetryFetchConfig,
    RetryWrapperConfig,
};

export {
    HttpResponseError,
    apiKeyAuthMiddleware,
    basicAuthMiddleware,
    chunkBy,
    createErrorThrowingClient,
    createXmlParser,
    getAwsIdFromArn,
    hasDefinedProperties,
    isHttpResponseError,
    logMiddleware,
    oAuth10aAuthMiddleware,
    oAuth20AuthMiddleware,
    parseXmlResponse,
    remap,
    requestTimeout,
    resignOauth10aRequest,
    retryFetch,
    retryWrapper,
    throwOnNotOk,
};

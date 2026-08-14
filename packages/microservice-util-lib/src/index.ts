/* v8 ignore start */
import chunkBy from './chunk-by/chunk-by';
import fetchSsmParams from './fetch-ssm-params/fetch-ssm-params';
import getAwsIdFromArn from './get-aws-id-from-arn/get-aws-id-from-arn';
import hasDefinedProperties from './has-properties-defined/has-properties-defined';
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
} from './openapi-fetch-middlewares/authentications';
import { LogLevel, Logger, logMiddleware } from './openapi-fetch-middlewares/log';
import { createXmlParser, parseXmlResponse } from './openapi-fetch-middlewares/parse-xml-response';
import { requestTimeout } from './openapi-fetch-middlewares/request-timeout';
import {
    RetryConfig as RetryMiddlewareConfig,
    retryMiddleware,
} from './openapi-fetch-middlewares/retry';
import { throwOnNotOk } from './openapi-fetch-middlewares/throw-on-not-ok';
import {
    ClientOptions,
    ErrorThrowingClient,
    createErrorThrowingClient,
} from './openapi-fetch-middlewares/throwing-client';
import type {
    OnRetryFn,
    RetryConditionFn,
    RetryContext,
    RetryDelayFn,
} from './openapi-fetch-middlewares/types/retry';
import {
    HttpResponseError,
    isHttpResponseError,
} from './openapi-fetch-middlewares/utils/http-response-error';
import remap, { ObjectMap, Remap } from './remap/remap';
import { RetryFetchConfig, retryFetch } from './retry-fetch/retry-fetch';
import retryWrapper, { RetryConfig, RetryWrapperConfig } from './retry-wrapper/retry-wrapper';
import S3Dao from './s3/s3';

export type {
    ApiKey,
    Basic,
    ClientOptions,
    ErrorThrowingClient,
    LogLevel,
    Logger,
    OAuth10a,
    OAuth20,
    ObjectMap,
    OnRetryFn,
    Remap,
    RetryConditionFn,
    RetryConfig,
    RetryContext,
    RetryDelayFn,
    RetryFetchConfig,
    RetryMiddlewareConfig,
    RetryWrapperConfig,
    S3Dao,
};

export {
    HttpResponseError,
    apiKeyAuthMiddleware,
    basicAuthMiddleware,
    chunkBy,
    createErrorThrowingClient,
    createXmlParser,
    fetchSsmParams,
    getAwsIdFromArn,
    hasDefinedProperties,
    isHttpResponseError,
    logMiddleware,
    oAuth10aAuthMiddleware,
    oAuth20AuthMiddleware,
    parseXmlResponse,
    remap,
    resignOauth10aRequest,
    retryFetch,
    retryMiddleware,
    retryWrapper,
    throwOnNotOk,
    requestTimeout,
};

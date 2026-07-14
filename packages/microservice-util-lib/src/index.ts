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
import {
    RetryConfig as RetryMiddlewareConfig,
    retryMiddleware,
} from './openapi-fetch-middlewares/retry';
import {
    ClientOptions,
    ErrorThrowingClient,
    createErrorThrowingClient,
} from './openapi-fetch-middlewares/throwing-client';
import {
    HttpResponseError,
    isHttpResponseError,
} from './openapi-fetch-middlewares/utils/http-response-error';
import remap, { ObjectMap, Remap } from './remap/remap';
import retryWrapper, { RetryConfig } from './retry-wrapper/retry-wrapper';
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
    Remap,
    RetryConfig,
    RetryMiddlewareConfig,
    S3Dao,
};

export {
    HttpResponseError,
    apiKeyAuthMiddleware,
    basicAuthMiddleware,
    chunkBy,
    createErrorThrowingClient,
    fetchSsmParams,
    getAwsIdFromArn,
    hasDefinedProperties,
    isHttpResponseError,
    logMiddleware,
    oAuth10aAuthMiddleware,
    oAuth20AuthMiddleware,
    remap,
    resignOauth10aRequest,
    retryMiddleware,
    retryWrapper,
};

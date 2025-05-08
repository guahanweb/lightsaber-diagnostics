import * as opentelemetry from "@opentelemetry/sdk-node";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import * as http from "http";

console.log('Initializing OpenTelemetry tracer...');
const serviceName = process.env.OTEL_SERVICE_NAME || 'unknown-service';
const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4318';

console.log(`Service Name: ${serviceName}`);
console.log(`OTLP Endpoint: ${endpoint}`);

// Create a trace exporter with debug logging
const traceExporter = new OTLPTraceExporter({
  url: endpoint + '/v1/traces',
});

// Create a metrics exporter with debug logging
const metricExporter = new OTLPMetricExporter({
  url: endpoint + '/v1/metrics',
});

const metricReader = new PeriodicExportingMetricReader({
  exporter: metricExporter,
  exportIntervalMillis: 15000, // Export metrics every 15 seconds
});

// Configure the trace provider with the resource
const provider = new NodeTracerProvider({
  resource: resourceFromAttributes({
    [SEMRESATTRS_SERVICE_NAME]: serviceName,
    [SEMRESATTRS_SERVICE_VERSION]: '1.0.0',
    'service.environment': 'development',
  }),
  spanProcessors: [
    new SimpleSpanProcessor(traceExporter),
  ],
});

// Register the provider
provider.register();

// Configure the SDK with only the necessary instrumentations
const sdk = new opentelemetry.NodeSDK({
  instrumentations: [
    getNodeAutoInstrumentations({
      // Only enable what we need for the demo
      '@opentelemetry/instrumentation-fs': { enabled: false }, 
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-http': { enabled: true },
    }),
  ],
  metricReader: metricReader,
});

console.log('Starting OpenTelemetry SDK...');
sdk.start();

// Gracefully shut down the SDK on process exit
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});

export default sdk;

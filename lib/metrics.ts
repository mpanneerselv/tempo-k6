import { Counter, Rate, Trend } from "k6/metrics";

export const tracesPushed = new Counter("traces_pushed");
export const tracesFound = new Counter("traces_found");
export const ingestionErrors = new Rate("ingestion_errors");
export const queryErrors = new Rate("query_errors");
export const searchResults = new Trend("search_results_count");

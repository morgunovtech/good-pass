// Cloudflare Pages Function for POST /api/v1/analyze; the logic is in src/api.js.
import { handleAnalyze, pagesFunction } from '../../../src/api.js';

export const onRequestPost = pagesFunction(handleAnalyze);

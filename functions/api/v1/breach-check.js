// Cloudflare Pages Function for POST /api/v1/breach-check; the logic is in src/api.js.
import { handleBreachCheck, pagesFunction } from '../../../src/api.js';

export const onRequestPost = pagesFunction(handleBreachCheck);

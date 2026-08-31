# Reliability experiments

Earlier synthetic experiments showed why lexical record search was insufficient: paraphrases could miss relevant evidence and unrelated shared words could select irrelevant records. They also verified that raw source retention, explicit confirmation, subject isolation, and WebMCP feature detection were viable.

The Release Candidate replaces answer-producing lexical retrieval with semantic evidence selection. Tests now treat an absent compression-test result as insufficient evidence and ensure WebMCP never fabricates an answer.

Audio experiments validated the single provider route `MediaRecorder or file → /api/transcribe → gpt-transcribe → editable text → confirmation`. The endpoint accepts audio only, enforces a 10 MiB limit, sanitizes filenames, and retains no audio. Public deployment exposure remains documented because the endpoint is billable and has no production authentication.

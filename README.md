# CBM Knowledge Base

A web app for CBM IT techs to search, submit, and browse resolved-ticket
knowledge base entries. Instead of digging back through old tickets from
scratch, a tech can search past issues by description, see how similar
problems were resolved, or log a newly resolved ticket so the next person
who hits the same issue can find it.

The app itself is a single self-contained page (`index.html`) with no
backend of its own — all the real work (AI summarization, semantic
search, and reading/writing records) happens in Rewst workflows backed by
IT Glue, which stores the actual knowledge base data. A Cloudflare Worker
(`cloudflare-worker.js`) sits between the app and Rewst to relay requests
and responses around browser cross-origin restrictions.

Hosted on GitHub Pages at
https://chaswheatley26.github.io/cbm-knowledge-base/.

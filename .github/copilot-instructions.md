# Mentor Workspace Instructions

This workspace uses the **Mentor** VS Code extension for RDF knowledge graphs. Mentor exposes its in-memory triple store through VS Code Language Model Tools. Always use these tools instead of reading files.

## Rules

**Never read RDF files directly.** Do not open, read, grep, or search `.ttl`, `.rdf`, `.owl`, `.n3`, `.jsonld`, or `.sparql` files to answer questions about the data. File reads fail on remote connections and bypass the RDF index. Always use the Mentor tools below instead.

**Always start with `#mentorGetQueryContext`.** When the user asks a domain question that will require SPARQL, call `#mentorGetQueryContext` first with the key terms from the question. It returns matched IRIs, depth-2 property chains, named graphs, and a focused prefix map — everything needed to write a correct query in one call.

**Use `#mentorListDatasets` for dataset metadata.** Questions about which datasets are loaded, when they were created, their descriptions, or their distributions must use this tool. Never read dataset files to find `dct:created` or similar metadata.

**Use `#mentorListInstances` to enumerate individuals.** Questions like "what production calendars exist?" or "which organisations are registered?" are answered with this tool, not by grepping Turtle files.

**Use `#mentorExecuteSparql` to query the data.** After establishing context with `#mentorGetQueryContext`, execute queries through this tool. Always scope queries to the named graph(s) returned in the context response.

## Tool quick reference

| Question type | First tool to call |
|---|---|
| Domain question needing SPARQL | `#mentorGetQueryContext` with key terms |
| What datasets / when created | `#mentorListDatasets` |
| What instances of class X exist | `#mentorListInstances` |
| What properties does class X use | `#mentorGetClassProperties` |
| Find an IRI from a name | `#mentorSearchByLabel` |
| All classes / properties / shapes | `#mentorGetVocabulary` |
| Prefix declarations | `#mentorGetPrefixes` |
| Which graphs are loaded | `#mentorListGraphs` |
| Full description of a resource | `#mentorDescribeResource` |
| Validate a SPARQL query | `#mentorValidateSparql` |

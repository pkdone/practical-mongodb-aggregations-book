# Full-Text Search Examples

This section provides examples for building an aggregation pipeline to perform a full-text search on one or more fields of documents in a collection.

The examples leverage Lucene-based search indexes delivered by [Atlas Search](https://www.mongodb.com/docs/atlas/atlas-search/atlas-search-overview/). Consequently, using these aggregations is only possible with an [Atlas Cluster](https://www.mongodb.com/atlas/database) rather than a self-installed MongoDB deployment.

&nbsp;

---

&nbsp;

Atlas Search makes adding fast relevance-based full-text search to your applications easy. Atlas Search deploys an Apache Lucene index next to your database, automatically handling data and schema synchronisation between the source collection and this new search index. Atlas Search provides fuzzy matching; auto-complete; fast facets and counts; highlighting; relevance scoring; geospatial queries; and synonyms, all backed by support for multiple language analysers. You reduce your cognitive load by invoking searches via the regular MongoDB drivers and Aggregations API rather than a 3rd party Lucene API.
 
With the Atlas platform's integration of database, search engine, and synchronisation pipeline into a single, unified, and fully managed service, you can quickly build search features into your applications. Consequently, this ease of use and its performance and functionality advantages mean you should use Atlas Search over MongoDB's `$text` and `$regex` query operators when running your database in Atlas.


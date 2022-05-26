# Compound Text Search Criteria

__Minimum MongoDB Version:__ 4.2


## Scenario

You want to search a collection of e-commerce products to find specific movie DVDs. Based on each DVD's full-text plot description, you want movies with a _post-apocalyptic_ theme, especially those related to a _nuclear_ disaster where some people _survive_. However, you aren't interested in seeing movies involving _zombies_.

> _To execute this example, you need to be using an Atlas Cluster rather than a self-managed MongoDB deployment. The simplest way to achieve this is to [provision a Free Tier Atlas Cluster](https://www.mongodb.com/cloud/atlas)._


## Sample Data Population

Drop any old version of the database (if it exists) and then populate a new _products_ collection with some _DVD_ and _Book_ records:

```javascript
use book-compound-text-search;
db.products.remove({});

// Insert 7 records into the products collection
db.products.insertMany([
  {
    "name": "The Road",
    "category": "DVD",
    "description": "In a dangerous post-apocalyptic world, a dying father protects his surviving son as they try to reach the coast",
  },
  {
    "name": "The Day Of The Triffids",
    "category": "BOOK",
    "description": "Post-apocalyptic disaster where most people are blinded by a meteor shower and then die at the hands of a new type of plant",
  },
  {
    "name": "The Road",
    "category": "BOOK",
    "description": "In a dangerous post-apocalyptic world, a dying father protects his surviving son as they try to reach the coast",
  },  
  {
    "name": "The Day the Earth Caught Fire",
    "category": "DVD",
    "description": "A series of nuclear explosions cause fires and earthquakes to ravage cities, with some of those that survive trying to rescue the post-apocalyptic world",
  },
  {
    "name": "28 Days Later",
    "category": "DVD",
    "description": "A caged chimp infected with a virus is freed from a lab, and the infection spreads to people who become zombie-like with just a few surviving in a post-apocalyptic country",
  },  
  {
    "name": "Don't Look Up",
    "category": "DVD",
    "description": "Pre-apocalyptic situation where some astronomers warn humankind of an approaching comet that will destroy planet Earth",
  },
  {
    "name": "Thirteen Days",
    "category": "DVD",
    "description": "Based on the true story of the Cuban nuclear misile threat, crisis is averted at the last minute and the workd survives",
  },
]); 
```

&nbsp;

Now, using the simple procedure described in the [Create Atlas Search Index](../../appendices/create-search-index.md) appendix, define a **Search Index**. Select the new database collection **book-compound-text-search.products** and enter the following JSON search index definition:

```javascript
{
  "searchAnalyzer": "lucene.english",
  "mappings": {
    "dynamic": true
  }
}
```

> _This definition indicates that the index should use the _lucene-english_ analyzer and include all document fields to be searchable with their inferred data types._


## Aggregation Pipeline

Define a pipeline ready to perform the aggregation:

```javascript
var pipeline = [
  // Search for DVDs where the description must contain "apocalyptic" but not "zombie"
  {"$search": {
    "index": "default",    
    "compound": {
      "must": [
        {"text": {
          "path": "description",
          "query": "apocalyptic",
        }},
      ],
      "should": [
        {"text": {
          "path": "description",
          "query": "nuclear survives",
        }},
      ],
      "mustNot": [
        {"text": {
          "path": "description",
          "query": "zombie",
        }},
      ],
      "filter": [
        {"text": {
          "path": "category",
          "query": "DVD",
        }},      
      ],
    }
  }},

  // Capture the search relevancy score in the output and omit the _id field
  {"$set": {
    "score": {"$meta": "searchScore"},
    "_id": "$$REMOVE",
  }},
];
```


## Execution

Execute the aggregation using the defined pipeline and also view its explain plan:

```javascript
db.products.aggregate(pipeline);
```

```javascript
db.products.explain("executionStats").aggregate(pipeline);
```


## Expected Results

Three documents should be returned, showing products which are post-apocalyptic themed DVDs, as shown below:

```javascript
[
  {
    name: 'The Day the Earth Caught Fire',
    category: 'DVD',
    description: 'A series of nuclear explosions cause fires and earthquakes to ravage cities, with some of those that survive trying to rescue the post-apocalyptic world',
    score: 0.8468831181526184
  },
  {
    name: 'The Road',
    category: 'DVD',
    description: 'In a dangerous post-apocalyptic world, a dying father protects his surviving son as they try to reach the coast',
    score: 0.3709350824356079
  },
  {
    name: "Don't Look Up",
    category: 'DVD',
    description: 'Pre-apocalyptic situation where some astronomers warn humankind of an approaching comet that will destroy planet Earth',
    score: 0.09836573898792267
  }
]
```

If you don't see any results, double-check that the system has finished generating your new index.


## Observations

 * __Search Stage.__ The [$search](https://www.mongodb.com/docs/atlas/atlas-search/query-syntax/) stage is only available in aggregation pipelines run against an Atlas-based MongoDB database which leverages [Atlas Search](https://www.mongodb.com/docs/atlas/atlas-search/). A `$search` stage must be the first stage of an aggregation pipeline, and [under the covers](https://www.mongodb.com/docs/atlas/atlas-search/atlas-search-overview/#fts-architecture), it instructs the system to execute a text search operation against an internally synchronised _Lucene_ full-text index. Inside the `$search` stage, you can only use one of a small set of [text-search specific pipeline operators](https://www.mongodb.com/docs/atlas/atlas-search/operators-and-collectors/). In this example, the pipeline uses a [$compound](https://www.mongodb.com/docs/atlas/atlas-search/compound/) operator to define a combination of multiple [$text](https://www.mongodb.com/docs/atlas/atlas-search/text/#std-label-text-ref) text-search operators.

 * __Results & Relevancy Explanation.__ The executed pipeline ignores four of the seven input documents and sorts the remaining three documents by highest relevancy first. It achieves this by applying the following actions:
    - It excludes two _book-related_ records because the `filter` option executes a `$text` match on just `DVD` in the _category_ field.
    - It ignores the "28 Days Later" DVD record because the `mustNot` option's `$text` matches "zombie" in the _description_ field.
    - It excludes the movie "Thirteen Days" because even though its description contains two of the optional terms ("nuclear" and "survives"), it doesn't include the mandatory term "apocalyptic".
    - It deduces the score of the remaining records based on the ratio of the number of matching terms ("apocalyptic", "nuclear", and "survives") in each document's `description` field versus how infrequently those terms appear in other documents in the same collection.

 * __English Language Analyzer.__ Atlas Search provides [multiple _Analyzer_ options](https://www.mongodb.com/docs/atlas/atlas-search/analyzers/) for breaking down generated text indexes and executing text queries into searchable tokens. The default analyzer, _Standard_, is not used here because the pipeline needs to match variations of the same English words. For example, "survives" and "surviving" need to refer to the same term, and hence the text index uses the _lucene.english_ analyzer.

 * __Meta Operator.__ The [$meta](https://www.mongodb.com/docs/manual/reference/operator/aggregation/meta/) operator provides supplementary metadata about the results of a text search performed earlier in a pipeline. When leveraging an Atlas Search based text search, the pipeline can look up a `searchScore` field in the metadata to access the relevancy score attributed to each text search result. This example uses `searchScore` to help you understand why the results are in a particular order, with some records having higher relevancy than others. In this example, it serves no other purpose, and you can omit it. However, in a different situation, you might want to use the search score to filter out low relevancy results in a later `$match` stage of a pipeline, for example.


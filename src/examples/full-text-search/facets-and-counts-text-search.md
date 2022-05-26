# Facets And Counts Text Search

__Minimum MongoDB Version:__ 4.4 &nbsp;&nbsp; _(due to use of the [facet](https://www.mongodb.com/docs/atlas/atlas-search/facet/) option in the [$searchMeta](https://www.mongodb.com/docs/atlas/atlas-search/query-syntax/) stage)_



## Scenario

You help run a bank's call centre and want to analyse the summary descriptions of customer telephone enquiries recorded by call centre staff. You want to look for customer calls that mention _fraud_ and understand what periods of a specific day these fraud-related calls occur. This insight will help the bank plan its future staffing rotas for the fraud department.

> _To execute this example, you need to be using an Atlas Cluster rather than a self-managed MongoDB deployment. The simplest way to achieve this is to [provision a Free Tier Atlas Cluster](https://www.mongodb.com/cloud/atlas)._


## Sample Data Population

Drop any old version of the database (if it exists) and then populate a new _enquiries_ collection with new records:

```javascript
use book-facets-text-search;
db.enquiries.remove({});

// Insert records into the enquiries collection
db.enquiries.insertMany([
  {
    "acountId": "9913183",
    "datetime": ISODate("2022-01-30T08:35:52Z"),
    "summary": "They just made a balance enquiry only - no other issues",
  },
  {
    "acountId": "9913183",
    "datetime": ISODate("2022-01-30T09:32:07Z"),
    "summary": "Reported suspected fraud - froze cards, initiated chargeback on the transaction",
  },
  {
    "acountId": "6830859",
    "datetime": ISODate("2022-01-30T10:25:37Z"),
    "summary": "Customer said they didn't make one of the transactions which could be fraud - passed on to the investigations team",
  },
  {
    "acountId": "9899216",
    "datetime": ISODate("2022-01-30T11:13:32Z"),
    "summary": "Struggling financially this month hence requiring extended overdraft - increased limit to 500 for 2 monts",
  },  
  {
    "acountId": "1766583",
    "datetime": ISODate("2022-01-30T10:56:53Z"),
    "summary": "Fraud reported - fradulent direct debit established 3 months ago - removed instruction and reported to crime team",
  },
  {
    "acountId": "9310399",
    "datetime": ISODate("2022-01-30T14:04:48Z"),
    "summary": "Customer rang on mobile whilst fraud call in progress on home phone to check if it was valid - advised to hang up",
  },
  {
    "acountId": "4542001",
    "datetime": ISODate("2022-01-30T16:55:46Z"),
    "summary": "Enquiring for loan - approved standard loan for 6000 voer 4 years",
  },
  {
    "acountId": "7387756",
    "datetime": ISODate("2022-01-30T17:49:32Z"),
    "summary": "Froze customer account when they called in as multiple fraud transactions appearing even whilst call was active",
  },
  {
    "acountId": "3987992",
    "datetime": ISODate("2022-01-30T22:49:44Z"),
    "summary": "Customer called claiming fraud for a transaction which confirmed looks suspicious and so issued chargeback",
  },
  {
    "acountId": "7362872",
    "datetime": ISODate("2022-01-31T07:07:14Z"),
    "summary": "Worst case of fraud I've ever seen - customer lost millions - escalated to our high value team",
  },
]);
```

&nbsp;

Now, using the simple procedure described in the [Create Atlas Search Index](../../appendices/create-search-index.md) appendix, define a **Search Index**. Select the new database collection **book-facets-text-search.enquiries** and enter the following JSON search index definition:

```javascript
{
  "analyzer": "lucene.english",
  "searchAnalyzer": "lucene.english",
  "mappings": {
    "dynamic": true,
    "fields": {
      "datetime": [
        {"type": "date"},
        {"type": "dateFacet"}
      ]
    }
  }
}
```

> _This definition indicates that the index should use the _lucene-english_ analyzer. It includes an explicit mapping for the `datetime` field to ask for the field to be indexed in two ways to simultaneously support a date range filter and faceting from the same pipeline. The mapping indicates that all other document fields will be searchable with inferred data types._


## Aggregation Pipeline

Define a pipeline ready to perform the aggregation:

```javascript
var pipeline = [
  // For 1 day match 'fraud' enquiries, grouped into periods of the day, counting them
  {"$searchMeta": {
    "index": "default",    
    "facet": {
      "operator": {
        "compound": {
          "must": [
            {"text": {
              "path": "summary",
              "query": "fraud",
            }},
          ],
          "filter": [
            {"range": {
              "path": "datetime",
              "gte": ISODate("2022-01-30"),
              "lt": ISODate("2022-01-31"),
            }},
          ],
        },
      },
      "facets": {        
        "fraudEnquiryPeriods": {
          "type": "date",
          "path" : "datetime",
          "boundaries": [
            ISODate("2022-01-30T00:00:00.000Z"),
            ISODate("2022-01-30T06:00:00.000Z"),
            ISODate("2022-01-30T12:00:00.000Z"),
            ISODate("2022-01-30T18:00:00.000Z"),
            ISODate("2022-01-31T00:00:00.000Z"),
          ],
        }            
      }        
    }           
  }},
];
```


## Execution

Execute the aggregation using the defined pipeline and also view its explain plan:

```javascript
db.enquiries.aggregate(pipeline);
```

Note, it is not currently possible to view the explain plan for a `$searchMeta` based aggregation.


## Expected Results

The results should show the pipeline matched 6 documents for a specific day on the text `fraud`, spread out over the four 6-hour periods, as shown below:

```javascript
[
  {
    count: { lowerBound: Long("6") },
    facet: {
      fraudEnquiryPeriods: {
        buckets: [
          {
            _id: ISODate("2022-01-30T00:00:00.000Z"),
            count: Long("0")
          },
          {
            _id: ISODate("2022-01-30T06:00:00.000Z"),
            count: Long("3")
          },
          {
            _id: ISODate("2022-01-30T12:00:00.000Z"),
            count: Long("2")
          },
          {
            _id: ISODate("2022-01-30T18:00:00.000Z"),
            count: Long("1")
          }
        ]
      }
    }
  }
]
```

If you don't see any facet results and the value of `count` is zero, double-check that the system has finished generating your new index.


## Observations

 * __Search Metadata Stage.__ The [$searchMeta](https://www.mongodb.com/docs/atlas/atlas-search/query-syntax/) stage is only available in aggregation pipelines run against an Atlas-based MongoDB database which leverages [Atlas Search](https://www.mongodb.com/docs/atlas/atlas-search/). A `$searchMeta` stage must be the first stage of an aggregation pipeline, and [under the covers](https://www.mongodb.com/docs/atlas/atlas-search/atlas-search-overview/#fts-architecture), it performs a text search operation against an internally synchronised Lucene full-text index. However, it is different from the `$search` operator used in the [earlier search example chapter](compound-text-search.md). Instead, you use `$searchMeta` to ask the system to return metadata about the text search you executed, such as the match count, rather than returning the search result records. The `$searchMeta` stage takes a `facet` option, which takes two options, `operator` and `facet`, which you use to define the text search criteria and categorise the results in groups.
 
 * __Date Range Filter.__ The pipeline uses a [$text](https://www.mongodb.com/docs/atlas/atlas-search/text/) operator for matching descriptions containing the term _fraud_. Additionally, the search criteria include a [$range](https://www.mongodb.com/docs/atlas/atlas-search/return-stored-source/) operator. The `$range` operator allows you to match records between two numbers or two dates. The example pipeline applies a date range, only including documents where each `datetime` field's value is _30-January-2022_. 

 * __Facet Boundaries.__ The pipeline uses a `facet` _collector_ to group metadata results by date range boundaries. Each boundary in the example defines a 6-hour period of the same specific day for a document's `datetime` field. A single pipeline can declare multiple facets; hence you give each facet a different name. The pipeline only defines one facet in this example, labelling it _fraudEnquiryPeriods_. When the pipeline executes, it returns the total count of matched documents and the count of matches in each facet grouping. There were no _fraud-related_ enquiries between midnight and 6am, indicating that perhaps the fraud department only requires "skeleton-staffing" for such periods. In contrast, the period between 6am and midday shows the highest number of fraud-related enquiries, suggesting the bank dedicates additional staff to those periods.

 * __Faster Facet Counts.__ A faceted index is a special type of Lucence index optimised to compute counts of dataset classifications. An application can leverage the index to offload much of the work required to analyse facets ahead of time, thus avoiding some of the latency costs when invoking a [faceted search](https://en.wikipedia.org/wiki/Faceted_search) at runtime. Therefore use the Atlas faceted search capability if you are in a position to adopt [Atlas Search](https://www.mongodb.com/docs/atlas/atlas-search/), rather than using MongoDB's general-purpose faceted search capability described in an [earlier example in this book](../trend-analysis/faceted-classifications.md).
 
 * __Combining A Search Operation With Metadata.__ In this example, a pipeline uses `$searchMeta` to obtain metadata from a search (counts and facets). What if you also want the actual search results from running`$search` similar to the [previous example](./compound-text-search.md)? You could invoke two operations from your client application, one to retrieve the search results and one to retrieve the metadata results. However, Atlas Search provides a way of obtaining both aspects within a single aggregation. Instead of using a `$searchMeta` stage, you use a `$search` stage. The pipeline [automatically stores its metadata](https://www.mongodb.com/docs/atlas/atlas-search/facet/#search_meta-aggregation-variable) in the `$$SEARCH_META` variable, ready for you to access it via subsequent stages in the same pipeline. For example: 

     ```javascript
     {"$set": {"mymetadata": "$$SEARCH_META"}}
     ```
 

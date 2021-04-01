# Faceted Classification

__Minimum MongoDB Version:__ 4.2


## Scenario

A user wants to classify a collection of data by different dimensions, where each dimension, or facet, corresponds to a particular field common to the documents in the collection. To classify each dimension, the range of values for the dimension field should be divided into sub-ranges. The series of sub-ranges should have a granularity pattern which reflects the specific number series rule selected for analysing the dimension.

In this example, an eCommerce retailer wants to provide a [faceted search](https://en.wikipedia.org/wiki/Faceted_search) capability in their retail website's user interface, to enable users to refine the product search results they see. This is enabled by the user selecting a sub-range from one of the different dimensions shown (e.g. select a displayed _price_ sub-range checkbox, or a _rating_ sub-range checkbox). To generate the set of facets ready to be selected, and the sub-ranges for each facet, requires first running an aggregation pipeline. This aggregation pipeline should analyse the data-set by each field that represents a facet (e.g. _price_, _rating_), to determine the spread of values for that field. The granularity of the sub-ranges for each facet should allow for the situation where the raw data being searched may have large 'clumps' of records with similar field values.


## Sample Data Population

Drop the old version of the database (if it exists) and then populate a new `products` collection with 16 documents:

```javascript
use book-faceted-classfctn;
db.dropDatabase();

// Insert 16 records into the collection
db.products.insertMany([
  {
    "name": "Asus Laptop",
    "category": "ELECTRONICS",
    "description": "Good value laptop for students",
    "price": NumberDecimal("431.43"),
    "rating": NumberDecimal("4.2"),
  },
  {
    "name": "The Day Of The Triffids",
    "category": "BOOKS",
    "description": "Classic post-apocalyptic novel",
    "price": NumberDecimal("5.01"),
    "rating": NumberDecimal("4.8"),
  },
  {
    "name": "Morphy Richardds Food Mixer",
    "category": "KITCHENWARE",
    "description": "Luxury mixer turning good cakes into great",
    "price": NumberDecimal("63.13"),
    "rating": NumberDecimal("3.8"),
  },
  {
    "name": "Karcher Hose Set",
    "category": "GARDEN",
    "description": "Hose + nosels + winder for tidy storage",
    "price": NumberDecimal("22.13"),
    "rating": NumberDecimal("4.3"),
  },
  {
    "name": "Oak Coffee Table",
    "category": "HOME",
    "description": "size is 2m x 0.5m x 0.4m",
    "price": NumberDecimal("22.13"),
    "rating": NumberDecimal("3.8"),
  },
  {
    "name": "Lenovo Laptop",
    "category": "ELECTRONICS",
    "description": "High spec good for gaming",
    "price": NumberDecimal("1299.99"),
    "rating": NumberDecimal("4.1"),
  },
  {
    "name": "One Day in the Life of Ivan Denisovich",
    "category": "BOOKS",
    "description": "Brutal life in a labour camp",
    "price": NumberDecimal("4.29"),
    "rating": NumberDecimal("4.9"),
  },
  {
    "name": "Russell Hobbs Chrome Kettle",
    "category": "KITCHENWARE",
    "description": "Nice looking budget kettle",
    "price": NumberDecimal("15.76"),
    "rating": NumberDecimal("3.9"),
  },
  {
    "name": "Tiffany Gold Chain",
    "category": "JEWELERY",
    "description": "Looks great for any age and gender",
    "price": NumberDecimal("582.22"),
    "rating": NumberDecimal("4.0"),
  },
  {
    "name": "Raleigh Racer 21st Century Classic",
    "category": "BICYCLES",
    "description": "Modern update to a classic 70s bike design",
    "price": NumberDecimal("523.00"),
    "rating": NumberDecimal("4.5"),
  },
  {
    "name": "Diesel Flare Jeans",
    "category": "CLOTHES",
    "description": "Top end casual look",
    "price": NumberDecimal("129.89"),
    "rating": NumberDecimal("4.3"),
  },
  {
    "name": "Jazz Silk Scarf",
    "category": "CLOTHES",
    "description": "Style for the winder months",
    "price": NumberDecimal("28.39"),
    "rating": NumberDecimal("3.7"),
  },
  {
    "name": "Dell XPS 13 Laptop",
    "category": "ELECTRONICS",
    "description": "Developer edition",
    "price": NumberDecimal("1399.89"),
    "rating": NumberDecimal("4.4"),
  },
  {
    "name": "NY Baseball Cap",
    "category": "CLOTHES",
    "description": "Blue & white",
    "price": NumberDecimal("18.99"),
    "rating": NumberDecimal("4.0"),
  },
  {
    "name": "Tots Flower Pots",
    "category": "GARDEN",
    "description": "Set of three",
    "price": NumberDecimal("9.78"),
    "rating": NumberDecimal("4.1"),
  },  
  {
    "name": "Picky Pencil Sharpener",
    "category": "Stationery",
    "description": "Ultra budget",
    "price": NumberDecimal("0.67"),
    "rating": NumberDecimal("1.2"),
  },  
]); 
```


## Aggregation Pipeline

Define a single pipeline ready to perform the aggregation:

```javascript
var pipeline = [
  // Group products by 2 facets: 1) by price ranges, 2) by rating ranges
  {"$facet": {

    // Group by price ranges
    "by_price": [
      // Group into 3 ranges: inexpensive small price range to expensive large price range
      {"$bucketAuto": {
        "groupBy": "$price",
        "buckets": 3,
        "granularity": "1-2-5",
        "output": {
          "count": {"$sum": 1},
          "products": {"$push": "$name"},
        },
      }},
      
      // Tag range info as "price_range"
      {"$set": {
        "price_range": "$_id",
      }},         
      
      // Remove old _id tag
      {"$unset": [
        "_id",
      ]},         
    ],

    // Group by rating ranges
    "by_rating": [
      // Group products evenly across 5 rating ranges from low to high
      {"$bucketAuto": {
        "groupBy": "$rating",
        "buckets": 5,
        "output": {
          "count": {"$sum": 1},
          "products": {"$push": "$name"},
        },
      }},
      
      // Tag range info as "rating_range"
      {"$set": {
        "rating_range": "$_id",
      }},         
      
      // Remove old _id tag
      {"$unset": [
        "_id",
      ]},         
    ],
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

A single document should be returned, which contains 2 different facets (keyed off `by_price` and `by_rating` respectively), where each facet shows the sub-ranges of values for the field and the subsets of products belonging to each sub-range, as shown below:

```javascript
[
  {
    by_price: [
      {
        count: 6,
        products: [
          'Picky Pencil Sharpener', 'One Day in the Life of Ivan Denisovich', 
          'The Day Of The Triffids', 'Tots Flower Pots', 'Russell Hobbs Chrome Kettle',
          'NY Baseball Cap'
        ],
        price_range: {
          min: Decimal128("0.500000000000000"), max: Decimal128("20.0000000000000")
        }
      },
      {
        count: 5,
        products: [
          'Karcher Hose Set', 'Oak Coffee Table', 'Jazz Silk Scarf',
          'Morphy Richardds Food Mixer', 'Diesel Flare Jeans'
        ],
        price_range: {
          min: Decimal128("20.0000000000000"), max: Decimal128("200.0000000000000")
        }
      },
      {
        count: 5,
        products: [
          'Asus Laptop', 'Raleigh Racer 21st Century Classic', 'Tiffany Gold Chain',
          'Lenovo Laptop', 'Dell XPS 13 Laptop'
        ],
        price_range: {
          min: Decimal128("200.0000000000000"), max: Decimal128("2000.0000000000000")
        }
      }
    ],
    by_rating: [
      {
        count: 4,
        products: [
          'Picky Pencil Sharpener', 'Jazz Silk Scarf', 'Morphy Richardds Food Mixer',
          'Oak Coffee Table'
        ],
        rating_range: { min: Decimal128("1.2"), max: Decimal128("3.9") }
      },
      {
        count: 3,
        products: [
          'Russell Hobbs Chrome Kettle', 'Tiffany Gold Chain', 'NY Baseball Cap'
        ],
        rating_range: { min: Decimal128("3.9"), max: Decimal128("4.1") }
      },
      {
        count: 3,
        products: [ 'Lenovo Laptop', 'Tots Flower Pots', 'Asus Laptop' ],
        rating_range: { min: Decimal128("4.1"), max: Decimal128("4.3") }
      },
      {
        count: 3,
        products: [
          'Karcher Hose Set', 'Diesel Flare Jeans', 'Dell XPS 13 Laptop'
        ],
        rating_range: { min: Decimal128("4.3"), max: Decimal128("4.5") }
      },
      {
        count: 3,
        products: [
          'Raleigh Racer 21st Century Classic', 'The Day Of The Triffids',
          'One Day in the Life of Ivan Denisovich'
        ],
        rating_range: { min: Decimal128("4.5"), max: Decimal128("4.9") }
      }
    ]
  }
]
```


## Observations & Comments

 * __Multiple Pipelines.__ The `$facet` stage doesn't have to be used to enable a `$bucketAuto` stage to be executed for creating field sub-ranges. Instead, a client application could call the aggregation framework multiple times, each time executing a `$bucketAuto` stage against a different field in the same collection, to obtain each facet separately. However, in most _faceted search_ uses cases, because it is common to want to understand the data by multiple dimensions at once (_price_ & _rating_), the `$facet` stage is a convenience to allow the application to ask for multiple `$bucketAuto` results in one go, using a single pipeline. In fact each element in the the defined `$facet` is just a regular aggregation [sub-]pipeline which can contain any types of stages (with a few specific documented exceptions). In some uses of `$facet`, a developer might not even utilise `$bucket` or `$bucketAuto` at all in the sub-pipelines.

 * __Single Document Result.__ If the Aggregation Framework allowed the result from a `$facet` based pipeline to be multiple documents, one for each sub-range regardless of facet it relates to, then this would cause a problem. The overall aggregation results would contain a mix of records from different facets but with no way of ascertaining which facet each record belongs to. Consequently, only one document is ever returned, containing a set of top-level fields, each identifying one facet. Each facet field in this result document is an array of sub-ranges, plus other metadata, relating to that facet only. For nearly all uses cases applicable to `$facet`, having a single document as a result is not a problem. This because the primary requirement is invariably to return a small amount of grouped summary data about a collection, rather than returning actual raw data from the collection.

 * __Spread Of Ranges.__ In this example, each of the two bucketing facets employed uses a different granularity number scheme for spreading out the sub-ranges of values. For the _rating_ facet, the default granularity for `$bucketAuto` is employed to divide the set of sub-ranges (buckets) evenly so each bucket has roughly a similar amount of products. In this case, 5 sub-ranges were asked for. As can be seen in the source collection, most of the ratings values are congregated between late 3s and early 4s, rather than being an even spread of ratings from 1.0 and 5.0. By using the default granularity for `$bucketAuto`, the sub-ranges are divided out so that there is roughly an even spread of products in each sub-range, which will allow customers to be able to drill-down to a sub-set of products quickly and effectively. As a consequence, some of the rating sub-ranges are coarse-grained (e.g. 1.2 to 3.9) and some are fine-grained (e.g. 3.9 to 4.1). For the _price_ facet, a different granularity number scheme was used (`1-2-5`) which attempts to reflect the fact that the retailer is selling lots of inexpensive items, fewer mid-price items and very few expensive items. Knowing this retail products pattern informs the choice of the `1-2-5` number scheme to achieve the desired width of each of the 3 price sub-ranges. 


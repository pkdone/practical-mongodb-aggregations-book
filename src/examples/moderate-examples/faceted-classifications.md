# Faceted Classification

__Minimum MongoDB Version:__ 4.2


## Scenario

You want to provide a [faceted search](https://en.wikipedia.org/wiki/Faceted_search) capability on your retail website to enable customers to refine their product search by selecting specific characteristics against the product results listed in the web page. It is beneficial to classify the products by different dimensions, where each dimension, or facet, corresponds to a particular field in a product record (e.g. _product rating_, _product price_). Each facet should be broken down into sub-ranges so that a customer can select a specific sub-range (_4 - 5 stars_) for a particular facet (e.g. _rating_). The aggregation pipeline will analyse the _products_ collection by each facet's field (_rating_ and _price_) to determine each facet's spread of values.


## Sample Data Population

Drop any old version of the database (if it exists) and then populate a new `products` collection with 16 documents (the database commands have been split in two to enable your clipboard to hold all the text - ensure you copy and execute each of the two sections):

&nbsp;__-Part 1-__

```javascript
use book-faceted-classfctn;
db.dropDatabase();

// Insert first 8 records into the collection
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
]);   
```

&nbsp;__-Part 2-__

```javascript
// Insert second 8 records into the collection
db.products.insertMany([  
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

A single document should be returned, which contains 2 facets (keyed off `by_price` and `by_rating` respectively), where each facet shows its sub-ranges of values and the products belonging to each sub-range, as shown below:

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


 * __Multiple Pipelines.__ The `$facet` stage doesn't have to be employed for you to use the `$bucketAuto` stage. In most _faceted search_ scenarios, you will want to understand a collection by multiple dimensions at once (_price_ & _rating_ in this case). The `$facet` stage is convenient because it allows you to define various `$bucketAuto` dimensions in one go in a single pipeline. Otherwise, a client application must invoke an aggregation multiple times, each using a new `$bucketAuto` stage to process a different field. In fact, each section of a `$facet` stage is just a regular aggregation [sub-]pipeline, able to contain any type of stage (with a few specific [documented exceptions](https://docs.mongodb.com/manual/reference/operator/aggregation/facet/#behavior)) and may not even contain `$bucketAuto` or `$bucket` stages at all. 

 * __Single Document Result.__ If the result of a `$facet` based aggregation is allowed to be multiple documents, this will cause a problem. The results will contain a mix of records originating from different facets but with no way of ascertaining the facet each result record belongs to. Consequently, when using `$facet`, a single document is always returned, containing top-level fields identifying each facet. Having only a single result record is not usually a problem. A typical requirement for faceted search is to return a small amount of grouped summary data about a collection rather than large amounts of raw data from the collection. Therefore the 16MB document size limit should not be an issue.

 * __Spread Of Ranges.__ In this example, each of the two employed bucketing facets uses a different granularity number scheme for spreading out the sub-ranges of values. You choose a numbering scheme based on what you know about the nature of the facet. For instance, most of the _ratings_ values in the sample collection have scores bunched between late 3s and early 4s. If a numbering scheme is defined to reflect an even spread of ratings, most products will appear in the same sub-range bucket and some sub-ranges would contain no products (e.g. ratings 2 to 3 in this example). This wouldn't provide website customers with much selectivity on product ratings.


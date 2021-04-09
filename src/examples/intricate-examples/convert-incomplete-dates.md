# Convert Incomplete Date Strings

__Minimum MongoDB Version:__ 4.2


## Scenario

An application is ingesting _payment_ documents into a MongoDB collection where each document's _payment date_ field contains a string looking vaguely like a date-time, such as `01-JAN-20 01.01.01.123000000`. You want to convert each _payment date_ into a valid BSON date type when aggregating the payments. However, the payment date fields do not contain all the information required for you to determine the exact date-time accurately. Therefore you cannot use just the MongoDB's [Date Expression Operators](https://docs.mongodb.com/manual/reference/operator/aggregation/#date-expression-operators) directly to perform the text-to-date conversion. Each of these text fields is missing the following information:

 * The specific __century__ (1900s?, 2000s, other?)
 * The specific __time-zone__ (GMT?, IST?, PST?, other?) 
 * The specific __language__ that the three-letter month abbreviation represents (is 'JAN' in French? in English? other?)

You subsequently learn that all the payment records are for the __21st century__ only, the time-zone used when ingesting the data is __UTC__, and the language used is __English__. Armed with this information, you build an aggregation pipeline to transform these text fields into date fields.


## Sample Data Population

Drop the old version of the database (if it exists) and then populate a new _payments_ collection with 12 sample payments documents, providing coverage across all 12 months for the year 2020, with random time elements.

```javascript
use book-convert-incomplete-dates;
db.dropDatabase();

// Insert 12 records into the payments collection
db.payments.insert([
  {"account": "010101", "payment_date": "01-JAN-20 01.01.01.123000000", "amount": 1.01},
  {"account": "020202", "payment_date": "02-FEB-20 02.02.02.456000000", "amount": 2.02},
  {"account": "030303", "payment_date": "03-MAR-20 03.03.03.789000000", "amount": 3.03},
  {"account": "040404", "payment_date": "04-APR-20 04.04.04.012000000", "amount": 4.04},
  {"account": "050505", "payment_date": "05-MAY-20 05.05.05.345000000", "amount": 5.05},
  {"account": "060606", "payment_date": "06-JUN-20 06.06.06.678000000", "amount": 6.06},
  {"account": "070707", "payment_date": "07-JUL-20 07.07.07.901000000", "amount": 7.07},
  {"account": "080808", "payment_date": "08-AUG-20 08.08.08.234000000", "amount": 8.08},
  {"account": "090909", "payment_date": "09-SEP-20 09.09.09.567000000", "amount": 9.09},
  {"account": "101010", "payment_date": "10-OCT-20 10.10.10.890000000", "amount": 10.10},
  {"account": "111111", "payment_date": "11-NOV-20 11.11.11.111000000", "amount": 11.11},
  {"account": "121212", "payment_date": "12-DEC-20 12.12.12.999000000", "amount": 12.12}
]);
```


## Aggregation Pipeline

Define a single pipeline ready to perform the aggregation:

```javascript
var pipeline = [
  // Change field from a string to a date, filling in the missing gaps
  {"$set": {
    "payment_date": {    
      "$let": {
        "vars": {
          "txt": "$payment_date",  // Assign "payment_date" field to variable "txt"
        },
        "in": { 
          "$dateFromString": {"format": "%d-%m-%Y %H.%M.%S.%L", "dateString":
            {"$concat": [
              {"$substrCP": ["$$txt", 0, 3]},  // Use 1st 3 chars in string
              {"$switch": {"branches": [  // Replace month 3 chars with month number
                {"case": {"$eq": [{"$substrCP": ["$$txt", 3, 3]}, "JAN"]}, "then": "01"},
                {"case": {"$eq": [{"$substrCP": ["$$txt", 3, 3]}, "FEB"]}, "then": "02"},
                {"case": {"$eq": [{"$substrCP": ["$$txt", 3, 3]}, "MAR"]}, "then": "03"},
                {"case": {"$eq": [{"$substrCP": ["$$txt", 3, 3]}, "APR"]}, "then": "04"},
                {"case": {"$eq": [{"$substrCP": ["$$txt", 3, 3]}, "MAY"]}, "then": "05"},
                {"case": {"$eq": [{"$substrCP": ["$$txt", 3, 3]}, "JUN"]}, "then": "06"},
                {"case": {"$eq": [{"$substrCP": ["$$txt", 3, 3]}, "JUL"]}, "then": "07"},
                {"case": {"$eq": [{"$substrCP": ["$$txt", 3, 3]}, "AUG"]}, "then": "08"},
                {"case": {"$eq": [{"$substrCP": ["$$txt", 3, 3]}, "SEP"]}, "then": "09"},
                {"case": {"$eq": [{"$substrCP": ["$$txt", 3, 3]}, "OCT"]}, "then": "10"},
                {"case": {"$eq": [{"$substrCP": ["$$txt", 3, 3]}, "NOV"]}, "then": "11"},
                {"case": {"$eq": [{"$substrCP": ["$$txt", 3, 3]}, "DEC"]}, "then": "12"},
               ], "default": "ERROR"}},
              "-20",  // Add hyphen + hardcoded century 2 digits
              {"$substrCP": ["$$txt", 7, 15]}  // Use remaining 3 millis (ignore last 6 nanosecs)
            ]
          }}                  
        }
      }        
    },             
  }},

  // Omit unwanted fields
  {"$unset": [
    "_id",
  ]},         
];
```


## Execution

Execute the aggregation using the defined pipeline and also view its explain plan:

```javascript
db.payments.aggregate(pipeline);
```

```javascript
db.payments.explain("executionStats").aggregate(pipeline);
```


## Expected Results

Twelve documents should be returned, corresponding to the original twelve source documents, but this time with the `payment_date` field converted from text values to proper date typed values, as shown below:

```javascript
[
  {
    account: '010101',
    payment_date: 2020-01-01T01:01:01.123Z,
    amount: 1.01
  },
  {
    account: '020202',
    payment_date: 2020-02-02T02:02:02.456Z,
    amount: 2.02
  },
  {
    account: '030303',
    payment_date: 2020-03-03T03:03:03.789Z,
    amount: 3.03
  },
  {
    account: '040404',
    payment_date: 2020-04-04T04:04:04.012Z,
    amount: 4.04
  },
  {
    account: '050505',
    payment_date: 2020-05-05T05:05:05.345Z,
    amount: 5.05
  },
  {
    account: '060606',
    payment_date: 2020-06-06T06:06:06.678Z,
    amount: 6.06
  },
  {
    account: '070707',
    payment_date: 2020-07-07T07:07:07.901Z,
    amount: 7.07
  },
  {
    account: '080808',
    payment_date: 2020-08-08T08:08:08.234Z,
    amount: 8.08
  },
  {
    account: '090909',
    payment_date: 2020-09-09T09:09:09.567Z,
    amount: 9.09
  },
  {
    account: '101010',
    payment_date: 2020-10-10T10:10:10.890Z,
    amount: 10.1
  },
  {
    account: '111111',
    payment_date: 2020-11-11T11:11:11.111Z,
    amount: 11.11
  },
  {
    account: '121212',
    payment_date: 2020-12-12T12:12:12.999Z,
    amount: 12.12
  }
]
```


## Observations & Comments

 * __Concatenation Explanation.__ In this pipeline, the text fields (e.g. `12-DEC-20 12.12.12.999000000`) are each converted to date fields (e.g. `2020-12-12T12:12:12.999Z`). This is achieved by concatenating together the following four example elements before passing them to the `$dateFromString` operator to convert to a date type:
   - `'12-'` _(day of the month from the input string + the hyphen suffix already present in the text)_
   - `'12'` _(replacing 'DEC')_
   - `'-20'` _(hard-coded hyphen + hardcoded century)_
   - `'20 12.12.12.999'` _(the rest of input string apart from the last 6 nanosecond digits)_
   
 * __Further Reading.__ This example is based on the output of the blog post: [Converting Gnarly Date Strings to Proper Date Types Using a MongoDB Aggregation Pipeline](https://pauldone.blogspot.com/2020/05/aggregation-convert-nasty-date-strings.html).
 

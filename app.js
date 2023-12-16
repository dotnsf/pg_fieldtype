//. app.js
var express = require( 'express' ),
    app = express();
var PG = require( 'pg' );

require( 'dotenv' ).config();
var database_url = 'DATABASE_URL' in process.env ? process.env.DATABASE_URL : '';
var pg = new PG.Pool({
  connectionString: database_url,
  //ssl: { require: true, rejectUnauthorized: false },
  idleTimeoutMillis: ( 3 * 86400 * 1000 )
});

app.use( express.static( __dirname + '/public' ) );
app.use( express.Router() );

//. CORS
var settings_cors = 'CORS' in process.env ? process.env.CORS : '';  //. "http://localhost:8080,https://xxx.herokuapp.com"
app.all( '/*', function( req, res, next ){
  if( settings_cors ){
    var origin = req.headers.origin;
    if( origin ){
      var cors = settings_cors.split( " " ).join( "" ).split( "," );

      //. cors = [ "*" ] への対応が必要
      if( cors.indexOf( '*' ) > -1 ){
        res.setHeader( 'Access-Control-Allow-Origin', '*' );
        res.setHeader( 'Access-Control-Allow-Methods', '*' );
        res.setHeader( 'Access-Control-Allow-Headers', '*' );
        res.setHeader( 'Vary', 'Origin' );
      }else{
        if( cors.indexOf( origin ) > -1 ){
          res.setHeader( 'Access-Control-Allow-Origin', origin );
          res.setHeader( 'Access-Control-Allow-Methods', '*' );
          res.setHeader( 'Access-Control-Allow-Headers', '*' );
          res.setHeader( 'Vary', 'Origin' );
        }
      }
    }
  }
  next();
});

app.get( '/ping', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  res.write( JSON.stringify( { status: true, message: 'PONG' }, null, 2 ) );
  res.end();
});

app.get( '/fieldtype', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  try{
    if( pg ){
      var results = [];
      //. テーブル一覧
      var r0 = await displayTables( pg );
      if( r0 && r0.status ){
        for( var idx = 0; idx < r0.results.length; idx ++ ){
          var tablename = r0.results[idx];
          var r1 = await displayTable( pg, tablename );
          if( r1 && r1.status && r1.result ){
            var fields = r1.result.fields;
            var types = r1.result._types._types.builtins;
            var columns = [];
            fields.forEach( function( f ){
              var dt = Object.keys( types ).reduce( function( r, key ){
                return types[key] === f.dataTypeID ? key : r;
              }, null );
              columns.push( { column_name: f.name, type: dt } );
            });
            console.log( {tablename} );
            console.log( {columns} );
            results.push( { table_name: tablename, columns: columns } );
          }
        }
      }
      
      res.write( JSON.stringify( { status: true, results: results }, null, 2 ) );
      res.end();
    }else{
      res.status( 400 );
      res.write( JSON.stringify( { status: false, error: 'no database_url specified.' }, null, 2 ) );
      res.end();
    }
  }catch( e ){
    console.log( e );
    res.status( 400 );
    res.write( JSON.stringify( { status: false, error: e } ) );
    res.end();
  }finally{
    if( fs.existsSync( 'tmp/' + outputfilename ) ){
      fs.unlinkSync( 'tmp/' + outputfilename );
    }
  }
});

//. display tables
async function displayTables( pg ){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        try{
          //var sql = '\dt';
          var sql = "select schemaname, tablename from pg_tables where schemaname = 'public'";
          var query = { text: sql, values: [] };
          conn.query( query, function( err, result ){
            if( err ){
              console.log( err );
              resolve( { status: false, error: err } );
            }else{
              var results = [];
              result.rows.forEach( function( row ){
                results.push( row.tablename );
              });
              resolve( { status: true, results: results } );
            }
          });
        }catch( e ){
          console.log( e );
          resolve( { status: false, error: e } );
        }finally{
          if( conn ){
            conn.release();
          }
        }
      }else{
        console.log( 'no db connection' );
        resolve( { status: false, error: 'no db connection' } );
      }
    }else{
      console.log( 'no db instance' );
      resolve( { status: false, error: 'no db instance' } );
    }
  });
}

//. display table
async function displayTable( pg, table ){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        try{
          var sql = 'select * from ' + table;
          var query = { text: sql, values: [] };
          conn.query( query, function( err, result ){
            if( err ){
              console.log( err );
              resolve( { status: false, error: err } );
            }else{
              resolve( { status: true, result: result } );
            }
          });
        }catch( e ){
          console.log( e );
          resolve( { status: false, error: e } );
        }finally{
          if( conn ){
            conn.release();
          }
        }
      }else{
        console.log( 'no db connection' );
        resolve( { status: false, error: 'no db connection' } );
      }
    }else{
      console.log( 'no db instance' );
      resolve( { status: false, error: 'no db instance' } );
    }
  });
}


var port = process.env.PORT || 8080;
app.listen( port );
console.log( "server starting on " + port + " ..." );

module.exports = app;

const chromium = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');
const mhtml2html = require('mhtml2html');
const aws = require('aws-sdk');
const s3 = new aws.S3();

const bucket = "atlas-page-saver"
const services = [
  'google_doc'
]

exports.handler = async (event, context) => {
  let result = null;
  let browser = null;
  const params = event.queryStringParameters || event;
  const url = params.url || 'http://www.example.com';

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });

    let page = await browser.newPage();

    await page.goto(url);

    for (var i=0; i<services.length; ++i) {
      const service = require('./lib/' + services[i]);
      if (service.match(url)) {
        await service.prepare(page);
      }
    }

    const session = await page.target().createCDPSession();
    await session.send('Page.enable');
    const {data} = await session.send('Page.captureSnapshot');

    const mhtmlParsed = mhtml2html.parse(data);
    const htmlDocument = mhtml2html.convert(mhtmlParsed);

    var filename = htmlDocument.title.replace(/\s/g, "-") + ".html";
    const location = "https://s3.amazonaws.com/" +
                     bucket + "/" +
                     Date.now() + "/" +
                     filename;

    const request = await s3.putObject({
      Bucket: bucket,
      Key: filename,
      Body: htmlDocument.documentElement.outerHTML,
      ContentType: "text/html"
    });

    var statusCode = 302;
    var body = "";
    await new Promise((resolve, reject) => {
      request.on('complete', function(response) {
          console.log("COMPLETE");
          resolve();
        }).on('success', function(response) {
          console.log("SUCCESS");
        }).on('error', function(response) {
          console.log("ERROR");
          statusCode = 500;
          body = response;
        }).
        send();
    });

    result = {
      "statusCode": statusCode,
      "headers": {
        "Location": location
      },
      "body": body
    };

  } catch (error) {
    console.log("FAILED");
    console.log(error);
    return context.fail(error);
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }

  return context.succeed(result);
};

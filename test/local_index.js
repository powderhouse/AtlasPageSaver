const puppeteer = require('puppeteer');
const mhtml2html = require('mhtml2html');

const services = [
  'google_doc'
]

exports.handler = async (event, context) => {
  let result = null;
  let browser = null;
  const url = (event.queryStringParameters || event).url || 'http://www.example.com';

  try {
    browser = await puppeteer.launch({headless: true});

    let page = await browser.newPage();

    page.on('console', consoleObj => console.log(consoleObj.text()));

    await page.goto(url);

    for (var i=0; i<services.length; ++i) {
      const service = require('../lib/' + services[i]);
      if (service.match(url)) {
        await service.prepare(page);
      }
    }

    const session = await page.target().createCDPSession();
    await session.send('Page.enable');
    const {data} = await session.send('Page.captureSnapshot');

    const mhtmlParsed = mhtml2html.parse(data);
    const htmlDocument = mhtml2html.convert(mhtmlParsed);
    result = {
      "statusCode": 200,
      "body": htmlDocument.documentElement.outerHTML
    };

  } catch (error) {
    return context.fail(error);
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }

  return context.succeed(result);
};

exports.handler({
  queryStringParameters: {
    url: "https://docs.google.com/presentation/d/110GezjbmppRVMwHwub6OP48igQAW5jksqaczB3_OxBw/edit#slide=id.p"
  }
}, {
  succeed: function (result) {
    console.log(result.body);
  },
  fail: function(error) {
    console.log("FAILED: " + error.stack)
  }
});

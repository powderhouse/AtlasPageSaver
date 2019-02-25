const chromium = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');
const mhtml2html = require('mhtml2html');

const services = [
  'google_doc'
]

exports.handler = async (event, context) => {
  let result = null;
  let browser = null;
  const url = (event.queryStringParameters || event).url || 'http://www.example.com';

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
    result = {
      "statusCode": 200,
      "headers": {
        "title": htmlDocument.title
      },
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

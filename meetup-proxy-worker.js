addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://yashrajnayak.github.io',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  }

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    })
  }

  try {
    const url = new URL(request.url)
    const targetPath = url.pathname.replace('/proxy/', '')
    const meetupUrl = `https://api.meetup.com${targetPath}${url.search}`

    // Log request details for debugging
    console.log('Request details:', {
      url: meetupUrl,
      method: request.method,
      headers: Object.fromEntries(request.headers),
      path: targetPath
    })

    let body = null
    let headers = {
      'Authorization': request.headers.get('Authorization') || '',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    }

    // Special handling for GraphQL requests
    if (targetPath === 'gql') {
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({
          error: 'Method Not Allowed',
          message: 'GraphQL endpoint only accepts POST requests'
        }), {
          status: 405,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        })
      }

      body = await request.text()
      console.log('GraphQL Request Body:', body)
    } else if (request.method === 'POST') {
      body = await request.text()
      console.log('POST Request Body:', body)
    }

    const response = await fetch(meetupUrl, {
      method: request.method,
      headers,
      body
    })

    // Log response details for debugging
    console.log('Response details:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers)
    })

    const responseBody = await response.text()
    console.log('Response Body:', responseBody)

    // Check if response is valid JSON
    try {
      JSON.parse(responseBody)
    } catch (e) {
      console.error('Invalid JSON response:', responseBody)
      return new Response(JSON.stringify({
        error: 'Invalid Response',
        message: 'The upstream server returned an invalid JSON response'
      }), {
        status: 502,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      })
    }

    // Combine response headers with CORS headers
    const responseHeaders = new Headers(corsHeaders)
    responseHeaders.set('Content-Type', 'application/json')

    return new Response(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    })

  } catch (error) {
    console.error('Proxy Error:', {
      message: error.message,
      stack: error.stack,
      cause: error.cause
    })

    return new Response(JSON.stringify({
      error: 'Proxy Error',
      message: error.message,
      type: error.name,
      details: error.cause
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    })
  }
} 
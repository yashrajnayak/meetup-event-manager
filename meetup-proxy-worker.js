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
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(request.url)
    const targetPath = url.pathname.replace('/proxy/', '')
    const meetupUrl = `https://api.meetup.com${targetPath}${url.search}`

    // Log request details for debugging
    console.log('Request URL:', meetupUrl)
    console.log('Request Method:', request.method)
    console.log('Request Headers:', Object.fromEntries(request.headers))

    let body = null
    if (request.method === 'POST') {
      body = await request.text()
      console.log('Request Body:', body)
    }

    const response = await fetch(meetupUrl, {
      method: request.method,
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      body: body,
    })

    // Log response details for debugging
    console.log('Response Status:', response.status)
    console.log('Response Headers:', Object.fromEntries(response.headers))

    const responseBody = await response.text()
    console.log('Response Body:', responseBody)

    // Combine response headers with CORS headers
    const headers = new Headers(corsHeaders)
    headers.set('Content-Type', 'application/json')

    return new Response(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers
    })

  } catch (error) {
    console.error('Proxy Error:', {
      message: error.message,
      stack: error.stack,
      cause: error.cause
    })

    return new Response(
      JSON.stringify({
        error: 'Proxy Error',
        message: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
} 
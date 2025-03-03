addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': 'https://yashrajnayak.github.io',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      }
    })
  }

  try {
    // Get the target URL from the request
    const url = new URL(request.url)
    const targetPath = url.pathname.replace('/proxy/', '')
    
    // Create the new request to Meetup API
    const meetupUrl = `https://api.meetup.com${targetPath}${url.search}`
    
    // Clone the headers and modify for the upstream request
    const headers = new Headers()
    
    // Copy specific headers from the original request
    const headersToForward = ['authorization', 'content-type']
    for (const header of headersToForward) {
      const value = request.headers.get(header)
      if (value) {
        headers.set(header, value)
      }
    }

    // Add required headers for Meetup API
    headers.set('Accept', 'application/json')
    headers.set('User-Agent', 'Meetup-Proxy/1.0')
    
    const requestInit = {
      method: request.method,
      headers: headers,
      redirect: 'follow'
    }

    // Only include body for POST requests
    if (request.method === 'POST') {
      const contentType = request.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        requestInit.body = await request.text()
      }
    }

    // Forward the request to Meetup API
    const response = await fetch(meetupUrl, requestInit)
    
    // Create a new response with CORS headers
    const responseHeaders = new Headers({
      'Access-Control-Allow-Origin': 'https://yashrajnayak.github.io',
      'Access-Control-Allow-Credentials': 'true',
      'Content-Type': 'application/json'
    })

    // Copy the response body
    const body = await response.text()
    
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.stack
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://yashrajnayak.github.io',
        'Access-Control-Allow-Credentials': 'true'
      }
    })
  }
} 
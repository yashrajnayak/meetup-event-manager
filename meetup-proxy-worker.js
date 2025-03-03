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
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    const headers = new Headers(request.headers)
    headers.delete('host')
    headers.set('origin', 'https://api.meetup.com')
    
    const meetupRequest = new Request(meetupUrl, {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' ? request.body : null,
      redirect: 'follow'
    })

    // Forward the request to Meetup API
    const response = await fetch(meetupRequest)
    
    // Create a new response with CORS headers
    const responseHeaders = new Headers(response.headers)
    responseHeaders.set('Access-Control-Allow-Origin', 'https://yashrajnayak.github.io')
    responseHeaders.set('Access-Control-Allow-Credentials', 'true')
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://yashrajnayak.github.io',
        'Access-Control-Allow-Credentials': 'true'
      }
    })
  }
} 
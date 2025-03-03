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
        'Access-Control-Max-Age': '86400',
      }
    })
  }

  // Get the target URL from the request
  const url = new URL(request.url)
  const targetPath = url.pathname.replace('/proxy/', '')
  
  // Create the new request to Meetup API
  const meetupUrl = `https://api.meetup.com${targetPath}${url.search}`
  
  const meetupRequest = new Request(meetupUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body
  })

  // Forward the request to Meetup API
  const response = await fetch(meetupRequest)
  
  // Create a new response with CORS headers
  const modifiedResponse = new Response(response.body, response)
  
  // Add CORS headers
  modifiedResponse.headers.set('Access-Control-Allow-Origin', 'https://yashrajnayak.github.io')
  
  return modifiedResponse
} 
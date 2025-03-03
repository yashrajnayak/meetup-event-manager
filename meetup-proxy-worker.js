addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': '*',
    'Access-Control-Allow-Headers': '*',
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

      // For GraphQL requests, always use the GraphQL endpoint
      const meetupUrl = 'https://api.meetup.com/gql'
      body = await request.text()
      console.log('GraphQL Request Body:', body)

      // Ensure the body is valid JSON and contains the query
      let parsedBody
      try {
        parsedBody = JSON.parse(body)
        if (!parsedBody.query) {
          return new Response(JSON.stringify({
            error: 'Invalid Request',
            message: 'GraphQL request must contain a query'
          }), {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          })
        }
      } catch (e) {
        return new Response(JSON.stringify({
          error: 'Invalid Request',
          message: 'Request body must be valid JSON'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        })
      }

      // Make the request to Meetup's GraphQL API
      try {
        const response = await fetch(meetupUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': request.headers.get('Authorization') || '',
            'Origin': 'https://www.meetup.com',
            'Referer': 'https://www.meetup.com/',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Host': 'api.meetup.com'
          },
          body
        })

        const responseBody = await response.text()
        console.log('GraphQL Response:', {
          status: response.status,
          body: responseBody
        })

        try {
          // Try to parse the response as JSON
          JSON.parse(responseBody)
          
          // If successful, return the response
          return new Response(responseBody, {
            status: response.status,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          })
        } catch (e) {
          // If parsing fails, return error
          return new Response(JSON.stringify({
            error: 'Invalid Response',
            message: 'The upstream server returned an invalid JSON response',
            details: responseBody.slice(0, 200)
          }), {
            status: 502,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          })
        }
      } catch (error) {
        console.error('GraphQL Request Error:', error)
        return new Response(JSON.stringify({
          error: 'GraphQL Request Failed',
          message: error.message,
          details: error.cause
        }), {
          status: 502,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        })
      }
    } else if (request.method === 'POST') {
      body = await request.text()
      console.log('POST Request Body:', body)

      // Make the request to Meetup's API
      try {
        const response = await fetch(meetupUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': request.headers.get('Authorization') || '',
            'Origin': 'https://www.meetup.com',
            'Referer': 'https://www.meetup.com/',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Host': 'api.meetup.com'
          },
          body
        })

        const responseBody = await response.text()
        console.log('REST Response:', {
          status: response.status,
          body: responseBody
        })

        try {
          // Try to parse the response as JSON
          JSON.parse(responseBody)
          
          // If successful, return the response
          return new Response(responseBody, {
            status: response.status,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          })
        } catch (e) {
          // If parsing fails, return error
          return new Response(JSON.stringify({
            error: 'Invalid Response',
            message: 'The upstream server returned an invalid JSON response',
            details: responseBody.slice(0, 200)
          }), {
            status: 502,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          })
        }
      } catch (error) {
        console.error('REST Request Error:', error)
        return new Response(JSON.stringify({
          error: 'REST Request Failed',
          message: error.message,
          details: error.cause
        }), {
          status: 502,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        })
      }
    } else {
      // For GET requests
      try {
        const response = await fetch(meetupUrl, {
          method: request.method,
          headers: {
            'Accept': 'application/json',
            'Authorization': request.headers.get('Authorization') || '',
            'Origin': 'https://www.meetup.com',
            'Referer': 'https://www.meetup.com/',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Host': 'api.meetup.com'
          }
        })

        const responseBody = await response.text()
        console.log('GET Response:', {
          status: response.status,
          body: responseBody
        })

        try {
          // Try to parse the response as JSON
          const parsedResponse = JSON.parse(responseBody)
          
          // If the response status is not ok (not in 200-299 range)
          if (!response.ok) {
            return new Response(JSON.stringify({
              error: 'Upstream Error',
              message: parsedResponse.message || response.statusText,
              status: response.status,
              details: parsedResponse
            }), {
              status: response.status,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            })
          }

          // If successful, return the response
          return new Response(responseBody, {
            status: response.status,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          })
        } catch (e) {
          // If parsing fails, return error
          return new Response(JSON.stringify({
            error: 'Invalid Response',
            message: 'The upstream server returned an invalid JSON response',
            details: responseBody.slice(0, 200)
          }), {
            status: 502,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          })
        }
      } catch (error) {
        console.error('GET Request Error:', error)
        return new Response(JSON.stringify({
          error: 'GET Request Failed',
          message: error.message,
          details: error.cause
        }), {
          status: 502,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        })
      }
    }

    // Check if response is valid JSON
    const responseBody = await response.text()
    console.log('Response Body:', responseBody)

    // Check if response is valid JSON
    let parsedResponse
    try {
      parsedResponse = JSON.parse(responseBody)
    } catch (e) {
      console.error('Invalid JSON response:', responseBody)
      return new Response(JSON.stringify({
        error: 'Invalid Response',
        message: 'The upstream server returned an invalid JSON response',
        details: responseBody.slice(0, 200), // Include first 200 chars of response for debugging
        status: response.status,
        statusText: response.statusText
      }), {
        status: 502,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      })
    }

    // Check for GraphQL errors
    if (targetPath === 'gql' && parsedResponse.errors) {
      return new Response(JSON.stringify({
        error: 'GraphQL Error',
        message: parsedResponse.errors[0]?.message || 'Unknown GraphQL error',
        errors: parsedResponse.errors,
        status: response.status
      }), {
        status: response.status === 200 ? 400 : response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      })
    }

    // If the response status is not ok (not in 200-299 range)
    if (!response.ok) {
      return new Response(JSON.stringify({
        error: 'Upstream Error',
        message: parsedResponse.message || response.statusText,
        status: response.status,
        details: parsedResponse
      }), {
        status: response.status,
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
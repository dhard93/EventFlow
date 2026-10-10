EventFlow - A full-stack web application for event/facilities managers

#################
# INTRODUCTION: #
#################

Eventually the application will be hosted on the web, but currently it
is just a demo of the backend. For this reason, I have created an
easy-to-use docker setup that contains the database and API. It uses FastAPI's uvicorn web server with Swagger UI to allow you to test the API endpoints from a web browser since the front end is not yet implemented.

This file contains preset strings/JSON that you can enter into different API endpoints to send requests to the server and Uvicorn will send back response bodies showing the results of the database queries.

The application divides users into 3 distinct types, which indicate the level of access they have. Guests are able to submit event requests to be approved/denied, Staff are able to mark scheduled events as set, and admin are able to approve/deny requests and view an analytics dashboard for their organization. All users have a main dashboard that allows them to interact with a calender view of each venue associated with their organization they register with.

This calender tool will allow users to view scheduled events for their organization's venues as well as filter and sort results by any column in the database.

This universal filtering system so far has only been implemented on the back end for the events table (see the tests below for examples), but will eventually be implemented for every table.

#######################
# SETUP INSTRUCTIONS: #
#######################

1. Install docker on your machine if it is not already installed.
2. Unzip the project into a directory of your choosing and navigate to 
   the project root folder, EventFlow (the one that has frontend, backend, and database directories inside it)
3. From the EventFlow directory in the terminal, run the following 
   commands to build a docker image of the project on your machine and start the uvicorn web server:

    docker compose build --no-cache
    docker compose up -d

4. Open a web browser and navigate to this URL:

    http://127.0.0.1:8000/docs#/

5. You will now be at the Swagger UI for FastAPI Uvicorn. This page 
   lists all currently-existing API endpoints. You can click on one, click 'try it out,' and then enter one of the preset values to test the API. See below for preset values you can paste into each API endpoint.

6. To shut down the uvicorn server, run this docker command:

    docker compose down

###################
# API TEST VALUES #
###################

To use Uvicorn for testing the API endpoints, select an endpoint and click the "Try it out" button and it will have fields where you can enter either string or JSON data. Below, each endpoint test has data value(s) you can paste into its field(s).

To test it, paste an endpoint's test data into the field(s) in Uvicorn and click the "Execute" button. The API will query the database using the data you provided and it will output the result of the query in JSON form.

Once the front end is implemented, these actions will all be done automatically with button presses in the UI, and submitting forms.

# Create event request:
-------------------------------------------------------------------------
- In Swagger UI, select the endpoint: POST /events (Create Event Request)

- Paste the below JSON into the 'Request Body' box:
{
    "org_id":"1",
    "venue_id":"2",
    "space_id":"7",
    "requesting_user_id":"3",
    "title":"Book Club Meeting",
    "description":"K-5 book club meeting in room 101 from noon to 5pm. We need 30 chairs in a circle, 1 microphone, and 1 TV.",
    "attendee_count":"20",
    "start_time":"2026-10-28 12:00:00",
    "end_time":"2026-10-28 17:00:00",
    "is_recurring":false,
    "recurrence_type":null,
    "recurrence_end_date":null,
    "request_status_id":"3",
    "resources":{"1":"20", "3":"1", "5":"1"}
}

- Click execute and a 200 server response showing "message": "Event request created" should be displayed in the response body.

# Search event requests with filters:
-------------------------------------------------------------------------
- In Swagger UI, select the endpoint: GET /events (Get Events)

TEST 1: Search for all pending event requests for organization with ID=1
- Paste the below JSON into the 'Filters' box:
{
    "org_filter":{"E.org_id":"1"},
    "search_filter":{"E.request_status_id":"3"}
}

- Click execute and a 200 server response showing the result of the query should be displayed in the response body with all pending event requests for organization 1.

-------------------------------------------------------------------------

TEST 2: Search for all APPROVED event requests for organization with ID=1 that have a date between 10-23-2026 and 10-30-2026:

{
    "org_filter":{"E.org_id":"1"},
    "search_filter":{"E.request_status_id":"1"},
    "time_filter":{"E.start_time::date":"BETWEEN '10-25-26' AND '10-30-2026'"}
}

# Process event request:
-----------------------------------------------------------------------------------------
- In Swagger UI, select the endpoint: Patch /events/status (process event request)

- Paste the following value into the req_id box:

    1

- Click execute and the response body should display message that the event request was approved or denied automatically.


# Get all venues associated with a particular organization:
-------------------------------------------------------------------------
- In Swagger UI, select the endpoint: GET /venues (Get org venues)

- Paste the following value into the org_id box:

    1

- Click execute and the response body should list all venues associated with the organization.


# Get all spaces associated with a particular venue:
-------------------------------------------------------------------------
- In Swagger UI, select the endpoint: GET /spaces (Get venue spaces)

- Paste the following value into the venue_id box:

    2

- Click execute and the response body should list all spaces associated with the venue.


# Get all users who have requested an event at a particular venue:
-------------------------------------------------------------------------
- In Swagger UI, select the endpoint: GET /users/req_event (Get venue spaces)

- Paste the following value into the venue_id box:

    2

- Click execute and the response body should list all users who have requested an event at the venue.


# Add a user to an organization:
-------------------------------------------------------------------------
- In swagger UI select the endpoint: POST /users (add user)

- Paste the following JSON into the request body:

{
    "org_id":"1",
    "email":"testemail0192@gmail.com",
    "password":"test_password_0918374!@#",
    "f_name":"Scott",
    "l_name":"Sterling",
    "account_type_id":"3"
}

- Click execute and the request body should have a 200 server response with a message indicating that the user was added to the database


# Delete a user from an organization:
-------------------------------------------------------------------------
- In swagger UI select the endpoint: DELETE /users (delete user)

- Paste the following value into the user_id box:

    2

- Click execute and the request body should have a 200 server response with a message indicating that the user was deleted from the database
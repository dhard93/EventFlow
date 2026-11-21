EventFlow - A full-stack web application for event/facilities managers

#################
# INTRODUCTION: #
#################

EventFlow is a React/FastAPI web application that provides an elegant and streamlined solution for event managers at small organizations for whom the typical enterprise solutions are not ideal. The front end and API are hosted via Render directly from GitHub and the database is hosted via Aiven. This is a college project, so it is using the free-tier hosting in each of these services as a way to demo the project for free. EventFlow is set up with Organizations as the root structure that everything else is derived from. The administrator for an organization registers for the first time with EventFlow, they create the Organization and their admin account, after which they arrive at the main dashboard of the application. The dashboard features are described below in the features section. Once an organization and administrator account are created, they can add venues, as well as the spaces available for event hosting for each venue, to their organization. Additionally, administrators can add guest user accounts for anyone that wishes to request events at the organization.

#############
# FEATURES: #
#############

Account-based access:
   - All user accounts have access to the following features:
      - My Account: modify email, password or name
      - Messages: real-time messaging system where you can view all current conversations and message people in your org
      - Notifications: shows notifications received from actions performed by other users
      - Calendar: Allows users to navigate months/years and see days with scheduled events. When a day is clicked in the calendar it shows all scheduled events for that day in the Event Table
      - Event Table: Displays all scheduled events for the day selected in the calendar. Can be filtered by venue.
         
   - Administrator accounts have access to the following features:
      - 'My Organization' page, where they can view/modify/delete venues, spaces, and guest users in their org
      - 'Add Venue' page, where they can add a new venue and its spaces to their org
      - 'Add User' page, where they can create new guest accounts
      - 'Analytics' dashboard, which displays useful trends for the current week/month/year or for all time

Real-Time Messaging/Notifications:
   - Server-Sent Events are used by the API to instantly send messages and notifications between connected users

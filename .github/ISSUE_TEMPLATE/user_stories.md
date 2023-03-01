---
name: User Stories
about: Use this template for user stories submission
title: "C3 Phase 1: User Stories"
labels: []
assignees: ""
---

## Frontend Selection
In two to three sentences, give a description on the frontend you are to build. Is it going to be a Web frontend? A Discord bot? What external packages, libraries, or frameworks would you need?

Do this **before** you go on to writing your user stores!

We will be building a web front end using HTML and CSS and plain JavaScript which will send REST API calls to our server. 


## User Stories + DoDs  
Make sure to follow the *Role, Goal, Benefit* framework for the user stories and the *Given/When/Then* framework for the Definitions of Done! For the DoDs, think about both success and failure scenarios. You can also refer to the examples DoDs in [C3 spec](https://sites.google.com/view/ubc-cpsc310-22w2/project/checkpoint-3).

### User Story 1

As a \<role\>, I want to \<goal\>, so that \<benefit\>.

#### Definitions of Done(s)

Scenario 1: \<The  name  for  the  behaviour  that  will  be  described\> \
Given: \<Some  initial  application  state  (precondition)\> \
When: \<The  user  do  some  series  of  action\> \
Then: \<Some  outcome  state  is  expected  (post-condition)\>

Scenario 2: \<The  name  for  the  behaviour  that  will  be  described\> \
Given: \<Some  initial  application  state  (precondition)\> \
When: \<The  user  do  some  series  of  action\> \
Then: \<Some  outcome  state  is  expected  (post-condition)\>

### User Story 2

As a student, I want to be able to search for the address by using the building's name 
so that I know where my classes are. 

#### Definitions of Done(s)

Scenario 1: invalid building name\
Given: The user is on the room finder section\
When: The user enters an invalid building name and clicks "Search"  \
Then: The application returns an error on the dashboard in red telling the user to try again>

Scenario 2: valid building name\
Given: The user is on the room finder section \
When: The user enters a valid building name and clicks "Search" \
Then: The application returns the address on the dashboard

### Others

You may provide any additional user stories + DoDs in this section for general TA feedback.

But these will not be graded.

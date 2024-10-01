# Drive Transfer Service UI
HTML/Javascript + Express JS UI that allows users to submit jobs and monitor their progress.

## Manual Set Up
### APIs and Services
1) From Google Cloud Console, navigate to `APIs and Services` page
2) Navigate to `Credentials` from left menu <br/>
![alt text](<img/apisservices.png>)
3) Click on "Create Credentials" > "OAuth client ID" <br/>
![alt text](<img/createcredentials.png>)
4) Select `Web application` from Application type dropdown and provide a name for your OAuth 2.0 client <br/>
![alt text](<img/createoauthclientid2.png>)
5) Under `Authorized JavaScript origins` add web app uri. <br/> 
![alt text](<img/authorizedjsoriginsandredirecturis2.png>)
6) Click `Create`

### Config File
1) Open `config/production.json` file and update the following params:

| Param | Description |
| -- | -- |
| firestore.dbConfig.projectId | GCP Project ID |
| firestore.dbConfig.dbName | Firestore Database ID |
| firestore.dbConfig.configName | Firestore Collection Name |
| app.api | Rclone-as-service API Endpoint |
| app.port | Web App Port |
| secret.clientId | OAuth 2.0 Client IDs created on `APIs and Services` in Google Cloud Console |

### Secret Manager
1) Open `Secret Manager` on cloud console
2) Click "Create Secret" button
3) Add "client_id" for `Name` field
4) Add the client id from `API & Services` for Secret Value field
5) Click "Create Secret" button

## Automated App Engine Deployment
Trigger automated build/deployment by committing change and tagging with a tag with the pattern `ui-[DATE]-[TIME]`:
```
git add .
git commit -m "[COMMIT_MESSAGE]"
git tag -a ui-[MMDDYY]-[HHMM] -m "[TAG_MESSAGE]"
git push origin ui-[MMDDYY]-[HHMM]
```

This will kick off the Cloud Build trigger `drive-transfer-service-ui-deploy` which will deploy a new App Engine Version to the `default` service.

## Manual App Engine Deployment
### Pre-Requisites
gcloud is installed. See instructions here [link](https://cloud.google.com/sdk/docs/install)

### Steps

1) Set Project
```
gcloud config set project PROJECT_ID
```

2) Authorize gcloud to access the Cloud Platform with Google user credentials
```
gcloud auth login
```

3) (Optional) Update `service` param in `app.yaml` file to change App Engine service name

4) Deploy code to App Engine
```
gcloud app deploy
```

5) Open the current app in a web browser. 
- To open the default service, run:
```
gcloud app browse
```
- To open a specific service (`service` param in `app.yaml`), run:
```
gcloud app browse --service="serviceName"
```


# Local Development & Testing
## Env 
Set node environment to 'development'
```
export NODE_ENV=development
```
## APIs & Services
1) From Google Cloud Console, navigate to `APIs and Services` page
2) Navigate to `Credentials` from left menu <br/>
![alt text](<img/apisservices.png>)
3) Click on "Create Credentials" > "OAuth client ID" <br/>
![alt text](<img/createcredentials.png>)
4) Select `Web application` from Application type dropdown and provide a name for your OAuth 2.0 client <br/>
![alt text](<img/createoauthclientid.png>)
5) Under `Authorized JavaScript origins` add localhost uri.  Under `Authorized redirect URIs`, add '/auth/google/redirect' uri. <br/>
![alt text](<img/authorizedjsoriginsandredirecturis.png>)
6) Click "Create"

## Config File
1) Open `config/develoment.json` file and update the following params

| Param | Description |
| -- | -- |
| firestore.dbConfig.projectId | GCP Project ID |
| firestore.dbConfig.dbName | Firestore Database ID |
| firestore.dbConfig.configName | Firestore Collection Name |
| app.api | Rclone-as-service API Endpoint |
| app.port | Web App Port |
| secret.clientId | OAuth 2.0 Client IDs created on `APIs and Services` in Google Cloud Console |


## Secret Manager
1) Open `Secret Manager` on cloud console
2) Click "Create Secret" button
3) Add "client_id" for `Name` field
4) Add the client id from `API & Services` for Secret Value field
5) Click "Create Secret" button


## Running Application locally
```
npm start
```
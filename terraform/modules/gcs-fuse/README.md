# Google Cloud Storage FUSE CSI Driver Setup

1) Navigate to the `kueue-autopilot` cluster in the GCP console and find the current version that your cluster is running (i.e. `1.30.3-gke.1225000`). Then navigate to this [compatability matrix](https://github.com/GoogleCloudPlatform/gcs-fuse-csi-driver/blob/main/docs/releases.md#gke-compatibility) to determine what image version of the Sidecar Mounter you may use. Click the value in the "Sidecar Container Image" column and copy the container path so you may pull the image to your local machine.

2) Run the following command to pull the compatible Google Cloud Storage FUSE CSI Driver image to your local machine. 
```
docker pull [CONTAINER_PATH]
```

3) Once the container image is pulled to your local machine, list all your local images to find out the Docker Image ID for the `gcs-fuse-csi-driver-sidecar-mounter` image and copy the value in the "IMAGE ID" column (i.e. `eadc341fdd44`):
```
docker image list
```

4) Run the following command to tag the image with the path to the `drive-transfer-service` Artifact Registry repository deployed in the "bootstrap" stage.
```
docker tag [IMAGE_ID] [REGION]-docker.pkg.dev/dmo-test-higashi/drive-transfer-service/gcs-fuse-csi-driver-sidecar-mounter:latest
```

5) Use the gcloud CLI credential helper to authenticate you to push to Artifact Registry from your local machine (this assumes you are already authenticated with gcloud by running `gcloud auth login`):
```
gcloud auth configure-docker [REGION]-docker.pkg.dev
```
where [REGION] should be the region you specified in the "bootstrap" stage when deploying the `drive-transfer-service` Artifact Registry repository.

6) Run the following command to push the Google Cloud Storage FUSE CSI Driver image to the `drive-transfer-service` Artifact Registry repository:
```
docker push [REGION]-docker.pkg.dev/dmo-test-higashi/drive-transfer-service/gcs-fuse-csi-driver-sidecar-mounter:latest
```
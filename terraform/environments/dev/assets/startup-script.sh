#! /bin/bash
# Install system packages
apt update
apt-get install -y git python3.11-venv
apt-get install -y kubectl
apt-get install -y google-cloud-sdk-gke-gcloud-auth-plugin
apt-get install -y google-cloud-cli-cloud-run-proxy

# Authenticate to Kueue cluster with Bastion Host Service Account credentials
export KUBECONFIG=~/.kube/config
gcloud container clusters get-credentials kueue-autopilot \
    --project=${project_id} \
    --internal-ip \
    --location=${region}

# Copy Kueue cluster config from Cloud Storage to Compute Engine instance
mkdir -p cluster-config
gsutil cp -r 'gs://bkt-${prefix}-kueue-cluster-config/*' ./cluster-config/

# Install Kueue on the cluster
kubectl apply -f cluster-config/1-namespaces.yaml
kubectl apply -f cluster-config/2-service-accounts.yaml
kubectl apply -f cluster-config/3-secrets.yaml
kubectl apply --server-side -f cluster-config/4-manifests.yaml

# Wait for the kueue-controller deployment to become available
if kubectl wait deploy/kueue-controller-manager -n kueue-system --for=condition=available --timeout=5m | grep -q "deployment.apps/kueue-controller-manager condition met"; then
    echo "Kueue controller is ready!"

    # Configure the Kueue Cluster / Local queues
    kubectl apply -f cluster-config/5-flavors.yaml
    kubectl apply -f cluster-config/6-cluster-queues.yaml
    kubectl apply -f cluster-config/7-local-queues.yaml

    # Install Kueue Visibility API
    kubectl apply --server-side -f cluster-config/8-visibility-api.yaml

else
    # Handle the case where the condition is not met
    echo "Kueue controller is not ready. Exiting..."
    exit 1
fi
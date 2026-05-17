import { getBaseURL } from './config.js';

const toast = (title) => {
  if (typeof uni !== 'undefined' && uni?.$u?.toast) {
    uni.$u.toast(title);
    return;
  }
  if (typeof uni !== 'undefined') {
    uni.showToast({ title, icon: 'none' });
  }
};

const showLoading = (title) => {
  if (typeof uni !== 'undefined') uni.showLoading({ title });
};

const hideLoading = () => {
  if (typeof uni !== 'undefined') uni.hideLoading();
};

export const buildRecordExportUrl = ({ id, memberId } = {}) => {
  const params = [];
  if (id !== undefined && id !== null && id !== '') {
    params.push(`id=${encodeURIComponent(id)}`);
  }
  if (memberId !== undefined && memberId !== null && memberId !== '') {
    params.push(`memberId=${encodeURIComponent(memberId)}`);
  }

  const query = params.length ? `?${params.join('&')}` : '';
  return `${getBaseURL()}/api/record/export${query}`;
};

const getFilename = (response) => {
  const disposition = response.headers.get('content-disposition') || '';
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (encoded?.[1]) return decodeURIComponent(encoded[1]);

  const plain = disposition.match(/filename="?([^"]+)"?/i);
  if (plain?.[1]) return plain[1];

  return `Health_Records_${Date.now()}.xlsx`;
};

const readErrorMessage = async (response) => {
  try {
    const data = await response.clone().json();
    return data?.message || data?.msg || '';
  } catch (e) {
    return '';
  }
};

const buildAuthHeader = (token) => (token ? { Authorization: `Bearer ${token}` } : {});

const downloadInBrowser = async (url, token) => {
  showLoading('Exporting...');

  try {
    const response = await fetch(url, {
      credentials: 'same-origin',
      headers: buildAuthHeader(token)
    });
    if (!response.ok) {
      const message = await readErrorMessage(response);
      toast(message || 'Export failed, please try again');
      return;
    }

    const blob = await response.blob();
    if (!blob.size) {
      toast('Export file is empty');
      return;
    }

    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = getFilename(response);
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    window.setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    }, 0);
  } catch (e) {
    toast('Export failed, please check your network');
  } finally {
    hideLoading();
  }
};

export const downloadExportFile = (url, token) => {
  if (!url || !token) {
    toast('Login expired, please sign in again');
    return;
  }

  if (typeof document !== 'undefined') {
    downloadInBrowser(url, token);
    return;
  }

  showLoading('Exporting...');
  uni.downloadFile({
    url,
    header: buildAuthHeader(token),
    success: (res) => {
      if (res.statusCode !== 200) {
        hideLoading();
        toast('Export failed, please try again');
        return;
      }

      uni.openDocument({
        filePath: res.tempFilePath,
        showMenu: true,
        success: () => hideLoading(),
        fail: () => {
          hideLoading();
          toast('File downloaded, preview is unavailable');
        }
      });
    },
    fail: () => {
      hideLoading();
      toast('Export failed, please try again');
    }
  });
};

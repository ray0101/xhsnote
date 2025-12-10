import { bitable, CurrencyCode, FieldType, ICurrencyField, ICurrencyFieldMeta } from '@lark-base-open/js-sdk';
import $ from 'jquery';

console.log('=== XHS Note Plugin Loading ===');
console.log('bitable import:', bitable);
console.log('jQuery import:', $);

// 显示状态消息
function showStatus(message: string, type: 'processing' | 'success' | 'error' = 'processing') {
  const statusEl = document.getElementById('status');
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    statusEl.style.display = 'block';

    // 自动隐藏成功和错误消息
    if (type === 'success' || type === 'error') {
      setTimeout(() => {
        statusEl.style.display = 'none';
      }, 3000);
    }
  }
}

// 显示加载动画
function showLoading() {
  const loadingEl = document.getElementById('loadingOverlay');
  if (loadingEl) {
    loadingEl.style.visibility = 'visible';
    loadingEl.style.opacity = '1';
  }
}

// 隐藏加载动画
function hideLoading() {
  const loadingEl = document.getElementById('loadingOverlay');
  if (loadingEl) {
    loadingEl.style.visibility = 'hidden';
    loadingEl.style.opacity = '0';
  }
}

// 验证租户授权并获取 token
async function verifyTenantAuthorization(): Promise<{ success: boolean, data?: any }> {
  try {
    const tenantKey = await bitable.bridge.getTenantKey();
    const userId = await bitable.bridge.getBaseUserId();
    console.log('Tenant key:', tenantKey);
    console.log('User ID:', userId);

    if (!tenantKey || !userId) {
      console.error('Missing tenant key or user ID');
      return { success: false };
    }

    // 构建表单数据
    const formData = new FormData();
    formData.append('tenantKey', tenantKey);
    formData.append('userId', userId);

    const response = await fetch('https://shop.leshangyundian.com/feishu/user/login', {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Authorization response:', data);

      if (data.success === true && data.data) {
        // 保存 token 和用户信息
        saveToken(data.data.token);
        saveUserInfo(data.data);

        // 显示用户信息
        displayUserInfo(data.data);

        return { success: true, data: data.data };
      }

      return { success: false };
    } else {
      console.error('Authorization failed:', response.status, response.statusText);
      return { success: false };
    }
  } catch (error) {
    console.error('Authorization error:', error);
    return { success: false };
  }
}

// 保存 token 到本地存储
function saveToken(token: string) {
  localStorage.setItem('xhsnote_token', token);
}

// 从本地存储读取 token
function loadToken(): string | null {
  return localStorage.getItem('xhsnote_token');
}

// 保存用户信息到本地存储
function saveUserInfo(userInfo: any) {
  localStorage.setItem('xhsnote_user_info', JSON.stringify(userInfo));
}

// 从本地存储读取用户信息
function loadUserInfo(): any | null {
  const saved = localStorage.getItem('xhsnote_user_info');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved user info:', e);
    }
  }
  return null;
}

// 显示用户信息
function displayUserInfo(userInfo: any) {
  $('#userName').text(userInfo.userName || '');
  $('#remainDownload').text(userInfo.remainDownload || 0);
  $('#userInfo').show();
}

// 清除认证信息
function clearAuth() {
  localStorage.removeItem('xhsnote_token');
  localStorage.removeItem('xhsnote_user_info');
}

// 从笔记内容中提取话题列表
function extractTopics(content: string): string[] {
  if (!content) return [];

  const topics: string[] = [];
  // 匹配 #话题名[话题]# 格式
  const topicRegex = /#([^#\[\]]+)\[话题\]#/g;
  let match;

  while ((match = topicRegex.exec(content)) !== null) {
    topics.push(match[1]);
  }

  return topics;
}


// 保存字段选择状态
function saveFieldSelection(selectedFields: string[]) {
  localStorage.setItem('xhsnote_selected_fields', JSON.stringify(selectedFields));
}

// 从本地存储读取字段选择状态
function loadFieldSelection(): string[] {
  const saved = localStorage.getItem('xhsnote_selected_fields');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved field selection:', e);
    }
  }
  // 默认返回核心字段
  return ['noteId', 'authorNickname', 'title', 'description', 'coverUrl', 'images'];
}

// 定义所有可选字段
const ALL_XHS_FIELDS: { [key: string]: { label: string, type: FieldType } } = {
  'noteId': { label: '小红书链接或笔记ID', type: FieldType.Text },
  'authorNickname': { label: '作者昵称', type: FieldType.Text },
  'authorXhsId': { label: '作者小红书号', type: FieldType.Text },
  'title': { label: '笔记标题', type: FieldType.Text },
  'description': { label: '笔记内容', type: FieldType.Text },
  'noteType': { label: '笔记类型', type: FieldType.Text },
  'publishTime': { label: '发布时间', type: FieldType.Text },
  'coverUrl': { label: '封面图', type: FieldType.Attachment },
  'images': { label: '图片列表', type: FieldType.Attachment },
  'videoUrl': { label: '视频地址', type: FieldType.Url },
  'videoDuration': { label: '视频时长', type: FieldType.Text },
  'tags': { label: '话题列表', type: FieldType.MultiSelect },
  'likes': { label: '点赞数', type: FieldType.Number },
  'collects': { label: '收藏数', type: FieldType.Number },
  'shares': { label: '转发数', type: FieldType.Number },
  'comments': { label: '评论数', type: FieldType.Number },
  'soundUrl': { label: '音频链接', type: FieldType.Url },
  'ipLocation': { label: '发文地址', type: FieldType.Text },
  'errorMsg': { label: '提示信息', type: FieldType.Text }
};

// 获取用户选择的字段
function getSelectedFields(): Array<{ name: string, label: string, type: FieldType }> {
  const selectedFields: Array<{ name: string, label: string, type: FieldType }> = [];

  $('input[name="fields"]:checked').each(function() {
    const fieldName = $(this).val() as string;
    const fieldInfo = ALL_XHS_FIELDS[fieldName];
    if (fieldInfo) {
      selectedFields.push({
        name: fieldName,
        label: fieldInfo.label,
        type: fieldInfo.type
      });
    }
  });

  // 确保 errorMsg 字段总是包含在内
  if (!selectedFields.some(f => f.name === 'errorMsg')) {
    const errorFieldInfo = ALL_XHS_FIELDS['errorMsg'];
    if (errorFieldInfo) {
      selectedFields.push({
        name: 'errorMsg',
        label: errorFieldInfo.label,
        type: errorFieldInfo.type
      });
    }
  }

  return selectedFields;
}

// 创建或获取字段ID
async function getOrCreateField(table: any, fieldName: string, fieldType: FieldType): Promise<string> {
  try {
    // 先尝试查找已存在的字段
    const fieldList = await table.getFieldMetaList();
    let existingField = fieldList.find((field: any) => field.name === fieldName);

    if (existingField) {
      // 检查字段类型是否匹配
      if (existingField.type !== fieldType) {
        console.log(`Field "${fieldName}" exists but type mismatch. Current: ${existingField.type}, Required: ${fieldType}`);
        console.log(`Field "${fieldName}" ID: ${existingField.id}`);
        // 返回现有字段ID，即使类型不匹配
        return existingField.id;
      }
      console.log(`Field "${fieldName}" already exists with ID: ${existingField.id}`);
      return existingField.id;
    }

    // 如果不存在，创建新字段
    console.log(`Creating new field "${fieldName}" with type: ${fieldType}`);
    const fieldId = await table.addField({
      type: fieldType,
      name: fieldName
    });

    console.log(`Field "${fieldName}" created with ID: ${fieldId}`);
    return fieldId;
  } catch (error) {
    console.error(`Error creating field "${fieldName}":`, error);
    // 不要抛出错误，而是返回空字符串
    return '';
  }
}

// 验证字段是否存在（简化版）
async function validateField(table: any, fieldId: string): Promise<boolean> {
  try {
    // 只检查字段ID是否存在于字段列表中
    const fieldList = await table.getFieldMetaList();
    return fieldList.some((field: any) => field.id === fieldId);
  } catch (error) {
    console.error(`Field validation error for ID ${fieldId}:`, error);
    return false;
  }
}

// 获取所有需要的字段ID
async function prepareXHSFields(table: any): Promise<Map<string, string>> {
  const fieldIdMap = new Map<string, string>();

  // 获取用户选择的字段
  const selectedFields = getSelectedFields();
  console.log('User selected fields:', selectedFields.map(f => f.name));

  if (selectedFields.length === 0) {
    showStatus('请至少选择一个字段', 'error');
    return fieldIdMap;
  }

  // 首先获取现有字段列表
  const existingFields = await table.getFieldMetaList();
  console.log('Existing fields:', existingFields.map((f: any) => ({ name: f.name, type: f.type, id: f.id })));

  // 删除所有旧的 XHS 字段（如果类型不匹配）
  for (const existingField of existingFields) {
    const xhsField = selectedFields.find(f => f.label === existingField.name);
    if (xhsField && existingField.type !== xhsField.type) {
      console.log(`Deleting field ${existingField.name} due to type mismatch (current: ${existingField.type}, required: ${xhsField.type})`);
      try {
        await table.deleteField(existingField.id);
        console.log(`Field ${existingField.name} deleted successfully`);
      } catch (error) {
        console.error(`Failed to delete field ${existingField.name}:`, error);
      }
    }
  }

  // 重新获取字段列表
  const updatedFields = await table.getFieldMetaList();

  // 创建或获取字段
  for (const field of selectedFields) {
    try {
      console.log(`Processing field: ${field.name}, label: ${field.label}, type: ${field.type}`);
      const fieldId = await getOrCreateField(table, field.label, field.type);

      // 即使是空字符串也尝试验证
      const fieldIdToValidate = fieldId || '';
      if (fieldIdToValidate) {
        // 验证字段是否真的存在并可访问
        const isValid = await validateField(table, fieldIdToValidate);
        if (isValid) {
          fieldIdMap.set(field.name, fieldIdToValidate);
          console.log(`Field ${field.name} -> ID: ${fieldIdToValidate} (validated)`);
        } else {
          console.error(`Field ${field.name} failed validation`);
          // 仍然添加到映射中，让用户知道尝试了
          fieldIdMap.set(field.name, fieldIdToValidate);
          console.log(`Field ${field.name} -> ID: ${fieldIdToValidate} (validation failed but added)`);
        }
      } else {
        console.error(`Failed to get ID for field ${field.name}`);
      }
    } catch (error) {
      console.error(`Failed to create field ${field.label}:`, error);
      // 继续处理其他字段
    }
  }

  // 如果选择了话题列表字段，先收集所有话题
  const tagsFieldSelected = selectedFields.some(f => f.name === 'tags');
  if (tagsFieldSelected) {
    console.log('Collecting topics from all records...');
    await collectAndAddTopics(table, fieldIdMap.get('tags'));
  }

  console.log(`Final field map size: ${fieldIdMap.size}`);
  console.log('Final field map entries:', Array.from(fieldIdMap.entries()));
  return fieldIdMap;
}

// 从所有记录中收集话题并添加到多选字段
async function collectAndAddTopics(table: any, tagsFieldId: string | undefined) {
  if (!tagsFieldId) {
    console.log('Tags field ID not found, skipping topic collection');
    return;
  }

  try {
    const recordIdList = await table.getRecordIdList();
    const columnSelect = $('#columnSelect').val() as string;
    const allTopics = new Set<string>();

    // 获取笔记链接字段
    const record = await table.getRecordById(recordIdList[0]);
    const fieldValue = record.fields[columnSelect];

    if (!fieldValue) {
      console.log('No content field found for topic extraction');
      return;
    }

    console.log(`Scanning ${recordIdList.length} records for topics...`);

    // 扫描所有记录提取话题
    for (let i = 0; i < Math.min(recordIdList.length, 100); i++) { // 限制扫描前100条以提高性能
      const recordId = recordIdList[i];
      try {
        const record = await table.getRecordById(recordId);
        const fieldValue = record.fields[columnSelect];

        if (fieldValue && (fieldValue as any).text) {
          const topics = extractTopics((fieldValue as any).text);
          topics.forEach(topic => allTopics.add(topic));
        }
      } catch (error) {
        console.error(`Error scanning record ${i}:`, error);
      }
    }

    console.log(`Found ${allTopics.size} unique topics:`, Array.from(allTopics));

    // 添加话题到多选字段
    if (allTopics.size > 0) {
      const multiSelectField = await table.getField(tagsFieldId);
      await multiSelectField.addOptions(Array.from(allTopics).map(topic => ({ name: topic })));
      console.log(`Added ${allTopics.size} topics to the multi-select field`);
    }
  } catch (error) {
    console.error('Error collecting topics:', error);
  }
}

// 将图片 URL 转换为 File 对象
async function createAttachmentFromUrl(imageUrl: string): Promise<File[]> {
  try {
    // 尝试下载图片
    const response = await fetch(imageUrl, { mode: 'cors' });
    if (!response.ok) {
      // 如果无法下载，返回空数组
      return [];
    }

    // 获取图片数据
    const blob = await response.blob();

    // 创建 File 对象
    const fileName = `cover_${Date.now()}.${blob.type.split('/')[1] || 'jpg'}`;
    const file = new File([blob], fileName, { type: blob.type });

    console.log('Created file:', file.name, file.size);

    return [file];
  } catch (error) {
    console.error('Error processing image URL:', error);
    console.warn('CORS or download error. Image will be skipped.');
    // 如果因为 CORS 或其他原因无法下载，返回空数组
    return [];
  }
}

// 批量处理多个图片 URL，返回附件 token 数组
async function createAttachmentsFromUrls(imageUrls: string[]): Promise<File[]> {
  if (!imageUrls || imageUrls.length === 0) {
    return [];
  }

  console.log(`Processing ${imageUrls.length} images...`);

  // 收集所有需要下载的图片
  const files: File[] = [];
  const downloadPromises: Promise<void>[] = [];

  imageUrls.forEach((url, index) => {
    const downloadPromise = (async () => {
      try {
        console.log(`Downloading image ${index + 1}/${imageUrls.length}:`, url);

        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) {
          console.warn(`Failed to fetch image ${index + 1}:`, response.statusText);
          return;
        }

        const blob = await response.blob();
        const fileName = `image_${Date.now()}_${index + 1}.${blob.type.split('/')[1] || 'jpg'}`;
        const file = new File([blob], fileName, { type: blob.type });

        console.log(`Created file ${index + 1}:`, file.name, file.size);
        files.push(file);
      } catch (error) {
        console.error(`Error downloading image ${index + 1}:`, error);
      }
    })();

    downloadPromises.push(downloadPromise);
  });

  // 等待所有图片下载完成
  await Promise.all(downloadPromises);

  console.log(`Successfully downloaded ${files.length} files`);
  return files;
}

// 加载表格的列信息
async function loadTableColumns(tableId: string) {
  try {
    const table = await bitable.base.getTableById(tableId);
    const fieldList = await table.getFieldMetaList();

    console.log('Field list:', fieldList);

    // 清空列下拉框
    $('#columnSelect').empty();

    if (fieldList && fieldList.length > 0) {
      // 只显示 URL 和文本类型的列
      const filteredFields = fieldList.filter(field =>
        field.type === FieldType.Text ||
        field.type === FieldType.Url
      );

      console.log('Filtered fields:', filteredFields);

      if (filteredFields.length > 0) {
        const columnOptions = filteredFields.map(field => {
          const typeName = field.type === FieldType.Url ? '链接' : '文本';
          return `<option value="${field.id}">${field.name} (${typeName})</option>`;
        }).join('');
        $('#columnSelect').append('<option value="">请选择笔记链接列</option>');
        $('#columnSelect').append(columnOptions);
      } else {
        $('#columnSelect').append('<option value="">未找到可用的笔记链接列</option>');
      }
    } else {
      $('#columnSelect').append('<option value="">没有可用的列</option>');
    }
  } catch (error) {
    console.error('Error loading columns:', error);
    $('#columnSelect').empty().append('<option value="">加载列失败</option>');
  }
}

// 等待 DOM 加载完成
console.log('DOM ready, initializing...');
$(document).ready(async function() {
  console.log('=== Document Ready Function Called ===');

  // 捕获所有未处理的错误
  window.addEventListener('error', function(event) {
    console.error('Uncaught error:', event.error);
  });

  window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
  });
  // 全局变量控制处理状态
  let isProcessing = false;
  let shouldPause = false;

  // 检测是否在飞书环境中
  try {
    // 尝试访问 bitable API，如果不存在则说明不在飞书环境
    if (typeof bitable === 'undefined') {
      console.error('Bitable API not available');
      // 延迟一秒后跳转到飞书，给用户时间看到错误信息
      setTimeout(() => {
        window.location.href = 'https://feishu.cn';
      }, 1000);
    } else {
      // 尝试获取环境信息
      try {
        const env = await bitable.bridge.getEnv();
        console.log('Environment:', env);

        // 如果不是飞书或Lark环境，跳转
        if (!env.product || (env.product !== 'feishu' && env.product !== 'lark')) {
          console.error('Not in Feishu or Lark environment');
          setTimeout(() => {
            window.location.href = 'https://feishu.cn';
          }, 1000);
        }
      } catch (envError) {
        // 环境检测失败，但继续执行，可能是API版本问题
        console.warn('Environment check failed, but continuing:', envError);
      }
    }
  } catch (error) {
    // 严重错误，但继续执行
    console.error('Environment check encountered error:', error);
  }

  // 从本地存储加载用户信息
  const savedUserInfo = loadUserInfo();
  if (savedUserInfo) {
    displayUserInfo(savedUserInfo);
  }

  // 显示加载动画
  showLoading();

  // 验证租户授权
  const authResult = await verifyTenantAuthorization();

  if (!authResult.success) {
    // 获取详细信息用于调试
    let tenantInfo = '';
    let baseUserInfo = '';
    try {
      const tenantKey = await bitable.bridge.getTenantKey();
      const baseUserId = await bitable.bridge.getBaseUserId();
      tenantInfo = tenantKey || '无法获取';
      baseUserInfo = baseUserId || '无法获取';
    } catch (e) {
      console.error('Failed to get debug info:', e);
    }

    // 验证失败，显示错误信息并禁用功能
    const loginUrl = `https://shop.leshangyundian.com/feishu/user/login`;
    const requestBody = {
      tenantKey: tenantInfo,
      userId: baseUserInfo
    };

    $('body').html(`
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: linear-gradient(135deg, #ffeef2 0%, #ffe4e8 100%);">
        <div style="text-align: center; padding: 40px; background: white; border-radius: 20px; box-shadow: 0 10px 40px rgba(255, 107, 107, 0.2); max-width: 700px;">
          <div style="font-size: 64px; margin-bottom: 20px;">😔</div>
          <h1 style="color: #ff2442; margin-bottom: 16px;">授权失败</h1>
          <p style="color: #666; margin-bottom: 24px;">无法验证您的授权信息，请将以下信息提供给管理员</p>

          <div style="background: #f5f5f5; padding: 20px; border-radius: 12px; margin-bottom: 24px; text-align: left;">
            <p style="margin: 0 0 10px 0;"><strong>Tenant Key:</strong></p>
            <code style="display: block; background: white; padding: 10px; border-radius: 6px; word-break: break-all; color: #ff2442;">${tenantInfo}</code>

            <p style="margin: 20px 0 10px 0;"><strong>Base User ID:</strong></p>
            <code style="display: block; background: white; padding: 10px; border-radius: 6px; word-break: break-all; color: #ff2442;">${baseUserInfo}</code>
      </div>

          <button onclick="location.reload()" style="padding: 12px 32px; background: linear-gradient(135deg, #ff2442 0%, #ff6b6b 100%); color: white; border: none; border-radius: 12px; font-size: 16px; cursor: pointer; transition: transform 0.2s; margin-right: 12px;">
            重新加载
          </button>
          <button onclick="navigator.clipboard.writeText('Tenant Key: ${tenantInfo}\\nBase User ID: ${baseUserInfo}\\nURL: ${loginUrl}\\nFormData: tenantKey=${tenantInfo}&userId=${baseUserInfo}')" style="padding: 12px 32px; background: white; color: #ff2442; border: 2px solid #ff2442; border-radius: 12px; font-size: 16px; cursor: pointer; transition: all 0.2s;">
            复制信息
          </button>
        </div>
      </div>
    `);
    return;
  }

  hideLoading();

  // 从本地存储加载字段选择状态
  const savedFields = loadFieldSelection();
  $('input[name="fields"]').each(function() {
    const field = $(this).val() as string;
    if (field === 'errorMsg') {
      // errorMsg 字段始终选中且不可取消
      $(this).prop('checked', true);
    } else {
      $(this).prop('checked', savedFields.includes(field));
    }
  });

  try {
    // 检查 bitable 是否可用
    console.log('bitable object:', bitable);
    console.log('bitable.base:', bitable.base);

    // 先检查 bitable.base 是否存在
    if (!bitable.base) {
      console.error('bitable.base is undefined');
      throw new Error('bitable.base is not available');
    }

    console.log('Getting table meta list...');
    const tableList = await bitable.base.getTableMetaList();
    console.log('Table meta list result:', tableList);

    console.log('Getting selection...');
    const selection = await bitable.base.getSelection();
    console.log('Selection result:', selection);

    console.log('Table list:', tableList);
    console.log('Selection:', selection);

    // 清空下拉框并添加选项
    $('#tableSelect').empty();

    if (tableList && tableList.length > 0) {
      const optionsHtml = tableList.map(table => {
        return `<option value="${table.id}">${table.name}</option>`;
      }).join('');
      $('#tableSelect').append(optionsHtml);

      // 设置默认选中的表格
      if (selection && selection.tableId) {
        $('#tableSelect').val(selection.tableId);
        // 加载默认表格的列
        await loadTableColumns(selection.tableId);
      }
    } else {
      $('#tableSelect').append('<option value="">No tables available</option>');
    }
  } catch (error) {
    console.error('Error loading tables:', error);
    $('#tableSelect').append('<option value="">Error loading tables</option>');
  }
  
  // 监听表格选择变化
  $('#tableSelect').on('change', async function() {
    const tableId = $(this).val() as string;
    console.log('Table selection changed, tableId:', tableId);

    if (tableId) {
      await loadTableColumns(tableId);
    } else {
      // 清空列下拉框
      $('#columnSelect').empty().append('<option value="">请先选择数据表</option>');
    }
  });

  // 处理笔记链接按钮事件
  $('#processColumn').on('click', async function() {
    try {
      const tableId = $('#tableSelect').val() as string;
      const fieldId = $('#columnSelect').val() as string;
      const token = loadToken();

      console.log('Process column clicked, tableId:', tableId, 'fieldId:', fieldId, 'token exists:', !!token);

      if (!tableId || !fieldId) {
        showStatus('请先选择数据表和笔记链接列', 'error');
        return;
      }

      if (!token) {
        showStatus('请先重新登录获取授权', 'error');
        return;
      }

      // 设置处理状态
      isProcessing = true;
      shouldPause = false;

      // 禁用按钮，显示暂停按钮
      $('#processColumn').prop('disabled', true).text('正在处理...');
      $('#pauseProcess').show();

      // 显示处理开始状态
      showStatus('开始处理数据...', 'processing');

      // 获取用户ID和插件ID
      const userId = await bitable.bridge.getBaseUserId();
      const instanceId = await bitable.bridge.getInstanceId();
      console.log('User ID:', userId, 'Instance ID:', instanceId);

      const table = await bitable.base.getTableById(tableId);

      // 准备所有需要的字段
      console.log('Preparing XHS fields...');
      const fieldIdMap = await prepareXHSFields(table);
      console.log('Fields prepared:', fieldIdMap);
      console.log('Field map size:', fieldIdMap.size);
      console.log('Field map entries:', Array.from(fieldIdMap.entries()));

      // 检查选中的字段是否成功创建
      const selectedFields = getSelectedFields();
      const missingFields = selectedFields.filter(field => !fieldIdMap.get(field.name));
      if (missingFields.length > 0) {
        console.error(`Missing selected fields: ${missingFields.map(f => f.name).join(', ')}`);
        showStatus(`部分字段创建失败: ${missingFields.map(f => f.label).join(', ')}. 请检查表格权限或刷新页面重试。`, 'error');
        return;
      }

      // 获取表格所有记录
      const recordIdList = await table.getRecordIdList();
      console.log('Total records:', recordIdList.length);

      let successCount = 0;
      let errorCount = 0;
      let updatedCount = 0;

      // 循环处理每条记录
      for (let i = 0; i < recordIdList.length && isProcessing; i++) {
        const recordId = recordIdList[i];
        try {
          // 检查是否暂停
          while (shouldPause && isProcessing) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 每秒检查一次
          }

          // 如果停止处理，跳出循环
          if (!isProcessing) {
            break;
          }

          // 添加随机延时，避免请求过于频繁
          if (i > 0) {
            const delay = Math.floor(Math.random() * 201) + 800; // 800-1000ms
            console.log(`Waiting ${delay}ms before request...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          // 获取记录中指定字段的值
          const record = await table.getRecordById(recordId);
          const fieldValue = record.fields[fieldId];

          console.log(`Record ${i + 1}/${recordIdList.length}, value:`, fieldValue);

          // 更新处理状态
          showStatus(`正在处理第 ${i + 1}/${recordIdList.length} 条记录...`, 'processing');

          // 如果值为空，跳过
          if (!fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0)) {
            console.log(`Skipping empty value for record ${i + 1}`);
            continue;
          }

          // 处理字段值
          let noteId = '';

          // 如果是数组，取第一个元素的 link 或 text 值
          if (Array.isArray(fieldValue)) {
            const firstItem = fieldValue[0];
            if (firstItem && typeof firstItem === 'object' && 'link' in firstItem) {
              noteId = (firstItem as any).link;
            } else if (firstItem && typeof firstItem === 'object' && 'text' in firstItem) {
              noteId = (firstItem as any).text;
            }
          }
          // 如果是字符串，直接使用
          else if (typeof fieldValue === 'string') {
            noteId = fieldValue;
          }
          // 如果是对象且有 link 属性
          else if (fieldValue && typeof fieldValue === 'object' && 'link' in fieldValue) {
            noteId = (fieldValue as any).link;
          }
          // 如果是对象且有 text 属性
          else if (fieldValue && typeof fieldValue === 'object' && 'text' in fieldValue) {
            noteId = (fieldValue as any).text;
          }

          // 如果仍然没有有效的值，跳过
          if (!noteId) {
            console.log(`Skipping record ${i + 1}: no valid noteId found`);
            continue;
          }

          console.log(`Sending request for noteId: ${noteId}`);

          const response = await fetch('https://shop.leshangyundian.com/feishu/user/xhs/note', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              noteId: noteId,
              userId: userId,
              instanceId: instanceId
            })
          });

          if (response.ok) {
            const responseData = await response.json();
            console.log(`Successfully processed record ${i + 1}:`, responseData);

            // 检查是否成功获取数据
            if (responseData && responseData.success === true) {
              successCount++;

              // 处理返回的数据
              const noteData = responseData.data || responseData;

              // 确定笔记类型
              const noteType = noteData.videoUrl ? '视频' : noteData.imageList && noteData.imageList.length > 0 ? '图文' : '文本';

              // 准备要更新的字段数据
              const fieldsToUpdate: { [key: string]: any } = {};

              // 调试：输出 fieldIdMap 的内容
              console.log('Field ID Map:', Array.from(fieldIdMap.entries()));

              // 映射数据到字段
              const noteIdField = fieldIdMap.get('noteId');
              console.log('noteIdField:', noteIdField);
              if (noteIdField) {
                fieldsToUpdate[noteIdField] = noteId;
              }

              // 数据获取成功时，清空提示信息字段
              const errorMsgField = fieldIdMap.get('errorMsg');
              if (errorMsgField) {
                fieldsToUpdate[errorMsgField] = '';
              }
              const authorNicknameField = fieldIdMap.get('authorNickname');
              if (authorNicknameField) fieldsToUpdate[authorNicknameField] = noteData.user ? noteData.user.name || noteData.user.nickname || '' : '';

              const authorXhsIdField = fieldIdMap.get('authorXhsId');
              if (authorXhsIdField) fieldsToUpdate[authorXhsIdField] = noteData.user ? noteData.user.redId || '' : '';

              const titleField = fieldIdMap.get('title');
              if (titleField) fieldsToUpdate[titleField] = noteData.title || '';

              const descriptionField = fieldIdMap.get('description');
              if (descriptionField) fieldsToUpdate[descriptionField] = noteData.desc || '';

              const noteTypeField = fieldIdMap.get('noteType');
              if (noteTypeField) fieldsToUpdate[noteTypeField] = noteType;

              const publishTimeField = fieldIdMap.get('publishTime');
              if (publishTimeField) fieldsToUpdate[publishTimeField] = noteData.createTimeStr || '';

              // 处理封面图片为附件（第一张）
              let coverFiles: File[] = [];
              let allFiles: File[] = [];

              if (noteData.imageList && noteData.imageList.length > 0) {
                const coverImageUrl = noteData.imageList[0].imageUrl || noteData.imageList[0].url || '';
                if (coverImageUrl) {
                  coverFiles = await createAttachmentFromUrl(coverImageUrl);
                  if (coverFiles.length > 0) {
                    console.log(`Downloaded ${coverFiles.length} cover image(s) for record ${recordId}`);
                  } else {
                    console.log(`Skipping cover image for record ${recordId} due to download error`);
                  }
                }

                // 处理所有图片为附件
                const imageUrls = noteData.imageList.map((img: any) => img.imageUrl || img.url).filter((url: string) => url);
                if (imageUrls.length > 0) {
                  console.log(`Processing ${imageUrls.length} images for record ${recordId}...`);
                  allFiles = await createAttachmentsFromUrls(imageUrls);
                  if (allFiles.length > 0) {
                    console.log(`Downloaded ${allFiles.length} images for record ${recordId}`);
                  } else {
                    console.log(`No images were processed for record ${recordId}`);
                  }
                }
              }

              const videoUrlField = fieldIdMap.get('videoUrl');
              if (videoUrlField) fieldsToUpdate[videoUrlField] = noteData.videoUrl || '';

              const videoDurationField = fieldIdMap.get('videoDuration');
              if (videoDurationField) fieldsToUpdate[videoDurationField] = noteData.videoDuration ? `${noteData.videoDuration}秒` : '';

              const tagsField = fieldIdMap.get('tags');
              if (tagsField) {
                // 从笔记内容中提取话题
                const description = noteData.desc || '';
                const extractedTopics = extractTopics(description);

                console.log(`Extracted topics for record ${recordId}:`, extractedTopics);

                try {
                  // 获取multi-select字段对象
                  const multiSelectField = await table.getField(tagsField);

                  // 获取现有选项
                  const existingOptions = await (multiSelectField as any).getOptions();
                  console.log('Existing options:', existingOptions);

                  // 如果有提取到的话题，添加到选项列表
                  if (extractedTopics.length > 0) {
                    // 找出需要新增的话题
                    const existingOptionNames = existingOptions.map((opt: any) => opt.name);
                    const topicsToAdd = extractedTopics.filter(topic => !existingOptionNames.includes(topic));

                    // 添加新的话题选项
                    if (topicsToAdd.length > 0) {
                      console.log('Adding new options:', topicsToAdd);
                      await (multiSelectField as any).addOptions(topicsToAdd.map(topic => ({ name: topic })));
                    }

                    // 重新获取更新后的选项列表
                    const updatedOptions = await (multiSelectField as any).getOptions();
                    console.log('Updated options:', updatedOptions);

                    // 获取所有选项的ID
                    const allOptionIds = updatedOptions.map((opt: any) => opt.id);
                    console.log('All option IDs:', allOptionIds);

                    // 设置所有选项作为该单元格的值
                    await multiSelectField.setValue(recordId, allOptionIds);
                    console.log(`Set all ${allOptionIds.length} options for record ${recordId}`);
                  } else {
                    // 如果没有提取到话题，但选项列表不为空，仍然设置所有选项
                    if (existingOptions.length > 0) {
                      const allOptionIds = existingOptions.map((opt: any) => opt.id);
                      await multiSelectField.setValue(recordId, allOptionIds);
                      console.log(`Set existing ${allOptionIds.length} options for record ${recordId} (no new topics extracted)`);
                    }
                  }
                } catch (error) {
                  console.error('Error handling multi-select field:', error);
                  // 失败时，设置为空数组
                  fieldsToUpdate[tagsField] = [];
                }
              }

              const likesField = fieldIdMap.get('likes');
              if (likesField) fieldsToUpdate[likesField] = parseInt(noteData.likedCount) || 0;

              const collectsField = fieldIdMap.get('collects');
              if (collectsField) fieldsToUpdate[collectsField] = parseInt(noteData.collectedCount) || 0;

              const sharesField = fieldIdMap.get('shares');
              if (sharesField) fieldsToUpdate[sharesField] = parseInt(noteData.sharedCount) || 0;

              const commentsField = fieldIdMap.get('comments');
              if (commentsField) fieldsToUpdate[commentsField] = parseInt(noteData.commentsCount) || 0;

              const soundUrlField = fieldIdMap.get('soundUrl');
              if (soundUrlField) fieldsToUpdate[soundUrlField] = noteData.soundUrl || '';

              const ipLocationField = fieldIdMap.get('ipLocation');
              if (ipLocationField) fieldsToUpdate[ipLocationField] = noteData.ipLocation || '';

              // 验证字段 ID 是否仍然有效
              console.log('Validating field IDs before update...');
              console.log('Fields to update count:', Object.keys(fieldsToUpdate).length);
              const currentFields = await table.getFieldMetaList();
              const validFieldsToUpdate: { [key: string]: any } = {};

              // 检查每个字段是否仍然存在
              for (const [fieldId, fieldValue] of Object.entries(fieldsToUpdate)) {
                const fieldExists = currentFields.find((f: any) => f.id === fieldId);

                if (fieldExists) {
                  validFieldsToUpdate[fieldId] = fieldValue;
                  console.log(`Field ${fieldExists.name} (ID: ${fieldId}) is valid`);
                } else {
                  console.warn(`Field ID ${fieldId} no longer exists, skipping...`);
                }
              }

              if (Object.keys(validFieldsToUpdate).length > 0) {
                // 更新记录
                console.log(`Updating record ${recordId} with ${Object.keys(validFieldsToUpdate).length} fields...`);
                await table.setRecord(recordId, {
                  fields: validFieldsToUpdate
                });

                updatedCount++;
                console.log(`Record ${i + 1} updated successfully`);

                // 单独设置附件字段
                if (coverFiles.length > 0) {
                  const coverFieldId = fieldIdMap.get('coverUrl');
                  if (coverFieldId) {
                    try {
                      console.log(`Getting cover field for ID: ${coverFieldId}`);
                      const coverField = await table.getField(coverFieldId);

                      if (coverField) {
                        console.log(`Setting cover attachments for record ${recordId}...`);

                        // 使用附件字段对象的 setValue 方法
                        await coverField.setValue(recordId, coverFiles);

                        console.log(`Cover attachments set for record ${recordId}`);
                      } else {
                      console.error(`Could not get cover field object`);
                    }
                    } catch (error) {
                      console.error(`Error setting cover attachments:`, error);
                    }
                  }
                }

                if (allFiles.length > 0) {
                  const imagesFieldId = fieldIdMap.get('images');
                  if (imagesFieldId) {
                    try {
                      console.log(`Getting images field for ID: ${imagesFieldId}`);
                      const imagesField = await table.getField(imagesFieldId);

                      if (imagesField) {
                        console.log(`Setting image attachments for record ${recordId}...`);

                        // 一次性设置所有图片
                        await imagesField.setValue(recordId, allFiles);

                        console.log(`Image attachments set for record ${recordId}`);
                      } else {
                      console.error(`Could not get images field object`);
                    }
                    } catch (error) {
                      console.error(`Error setting image attachments:`, error);
                    }
                  }
                }

                // 验证附件是否已保存
                await new Promise(resolve => setTimeout(resolve, 3000)); // 等待3秒让附件上传完成

                // 获取附件字段并验证
                const coverFieldId = fieldIdMap.get('coverUrl');
                if (coverFieldId) {
                  try {
                    const coverField = await table.getField(coverFieldId);
                    if (coverField) {
                      // 尝试获取值
                      const coverValue = await table.getCellValue(coverFieldId, recordId);
                      console.log(`Cover cell value for record ${recordId}:`, coverValue);
                    }
                  } catch (error) {
                    console.error(`Error getting cover field URLs:`, error);
                  }
                }

                const imagesFieldId = fieldIdMap.get('images');
                if (imagesFieldId) {
                  try {
                    const imagesField = await table.getField(imagesFieldId);
                    if (imagesField) {
                      // 尝试获取值
                      const imagesValue = await table.getCellValue(imagesFieldId, recordId);
                      console.log(`Images cell value for record ${recordId}:`, imagesValue);
                    }
                  } catch (error) {
                    console.error(`Error getting images field URLs:`, error);
                  }
                }
              } else {
                console.warn(`No valid fields to update for record ${recordId}`);
              }
            } else {
              // API返回success=false，记录错误信息
              console.log(`API returned success=false for record ${i + 1}`);
              errorCount++;

              // 获取错误信息
              const errorMsg = responseData.msg || responseData.message || '数据获取失败';

              // 将错误信息填入提示信息字段
              const errorMsgField = fieldIdMap.get('errorMsg');
              if (errorMsgField) {
                try {
                  await table.setRecord(recordId, {
                    fields: {
                      [errorMsgField]: errorMsg
                    }
                  });
                  console.log(`Error message saved for record ${recordId}: ${errorMsg}`);
                } catch (error) {
                  console.error(`Failed to save error message for record ${recordId}:`, error);
                }
              }
            }
          } else {
            // 尝试读取错误响应
            let errorText = response.statusText;
            try {
              const errorData = await response.json();
              errorText = JSON.stringify(errorData);
            } catch (e) {
              errorText = await response.text();
            }
            console.error(`Failed to process record ${i + 1}:`, response.status, errorText);
            errorCount++;

            // 记录错误信息到 errorMsg 字段
            const errorMsgField = fieldIdMap.get('errorMsg');
            if (errorMsgField) {
              const fieldsToUpdate: { [key: string]: any } = {};
              fieldsToUpdate[errorMsgField] = `错误 ${response.status}: ${errorText}`;

              // 确保字段仍然有效
              const currentFields = await table.getFieldMetaList();
              if (currentFields.find((f: any) => f.id === errorMsgField)) {
                try {
                  await table.setRecord(recordId, {
                    fields: fieldsToUpdate
                  });
                  console.log(`Error message saved for record ${recordId}`);
                } catch (error) {
                  console.error(`Failed to save error message for record ${recordId}:`, error);
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error processing record ${i + 1}:`, error);
          errorCount++;

          // 记录错误信息到 errorMsg 字段
          const errorMsgField = fieldIdMap.get('errorMsg');
          if (errorMsgField) {
            const fieldsToUpdate: { [key: string]: any } = {};
            fieldsToUpdate[errorMsgField] = `处理错误: ${error instanceof Error ? error.message : String(error)}`;

            // 确保字段仍然有效
            try {
              const currentFields = await table.getFieldMetaList();
              if (currentFields.find((f: any) => f.id === errorMsgField)) {
                try {
                  await table.setRecord(recordId, {
                    fields: fieldsToUpdate
                  });
                  console.log(`Error message saved for record ${recordId}`);
                } catch (e) {
                  console.error(`Failed to save error message for record ${recordId}:`, e);
                }
              }
            } catch (e) {
              console.error(`Failed to validate field for error message:`, e);
            }
        }
      }
    }

    // 恢复按钮状态
    isProcessing = false;
    $('#processColumn').prop('disabled', false).text('开始处理');
    $('#pauseProcess').hide();

    const processedCount = successCount + errorCount;
    const skippedCount = recordIdList.length - processedCount;
    const message = `处理完成！\n成功: ${successCount}\n记录更新: ${updatedCount}\n失败数量: ${errorCount}\n跳过空值: ${skippedCount}\n\n如果附件没有显示，请刷新页面查看。`;
    showStatus(message, message.includes('完成') ? 'success' : 'error');
  } catch (error) {
    console.error('Error processing column:', error);
    showStatus('处理失败：' + (error instanceof Error ? error.message : String(error)), 'error');
    // 恢复按钮状态
    isProcessing = false;
    $('#processColumn').prop('disabled', false).text('开始处理');
    $('#pauseProcess').hide();
  }
});

  // 暂停/继续按钮事件
  $('#pauseProcess').on('click', function() {
    shouldPause = !shouldPause;
    $(this).text(shouldPause ? '继续处理' : '暂停处理');
  });

  // 充值按钮事件
  $('#rechargeBtn').on('click', function() {
    const token = loadToken();
    const userInfo = loadUserInfo();

    if (userInfo && userInfo.userId && token) {
      const paymentUrl = `https://shop.leshangyundian.com/payment?id=${userInfo.userId}&token=${token}&type=NOTE`;
      window.open(paymentUrl, '_blank');
    } else {
      showStatus('请先重新登录获取授权', 'error');
    }
  });

  // 全选按钮事件
  $('#selectAllFields').on('click', function() {
    $('input[name="fields"]:not(:disabled)').prop('checked', true);
    updateFieldSelection();
  });

  // 反选按钮事件
  $('#deselectAllFields').on('click', function() {
    $('input[name="fields"]:not(:disabled)').each(function() {
      $(this).prop('checked', !$(this).prop('checked'));
    });
    updateFieldSelection();
  });

  // 字段选择变化事件 - 保存选择状态
  $('input[name="fields"]').on('change', updateFieldSelection);

  // 更新字段选择状态
  function updateFieldSelection() {
    const selectedFields: string[] = [];
    $('input[name="fields"]:checked').each(function() {
      const field = $(this).val() as string;
      selectedFields.push(field);
    });
    saveFieldSelection(selectedFields);
  }
});
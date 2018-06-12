/* global $ store*/
'use strict';

const api = (function() {
  const search = function(path, query) {
    return $.ajax({
      headers: { 'Authorization': `Bearer ${store.authToken}` },
      type: 'GET',
      url: path,
      dataType: 'json',
      data: query
    });
  };
  const details = function(path) {
    return $.ajax({
      headers: { 'Authorization': `Bearer ${store.authToken}` },
      url: path,
      type: 'GET',
      dataType: 'json'
    });
  };
  const update = function(path, obj) {
    return $.ajax({
      headers: { 'Authorization': `Bearer ${store.authToken}` },
      url: path,
      type: 'PUT',
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify(obj)
    });
  };
  const create = function(path, obj) {
    return $.ajax({
      headers: { 'Authorization': `Bearer ${store.authToken}` },
      url: path,
      type: 'POST',
      contentType: 'application/json',
      dataType: 'json',
      processData: false,
      data: JSON.stringify(obj)
    });
  };
  const remove = function(path) {
    return $.ajax({
      headers: { 'Authorization': `Bearer ${store.authToken}` },
      url: path,
      type: 'DELETE',
      dataType: 'json'
    });
  };
  return {
    create,
    search,
    details,
    update,
    remove
  };
}());
